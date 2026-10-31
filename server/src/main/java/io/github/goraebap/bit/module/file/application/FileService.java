package io.github.goraebap.bit.module.file.application;

import io.github.goraebap.bit.module.file.AttachedFile;
import io.github.goraebap.bit.module.file.FileFacade;
import io.github.goraebap.bit.module.file.FileOwner;
import io.github.goraebap.bit.module.file.domain.Attachment;
import io.github.goraebap.bit.module.file.domain.AttachmentRepository;
import io.github.goraebap.bit.module.file.domain.FileFormat;
import io.github.goraebap.bit.module.file.domain.ImageTraits;
import io.github.goraebap.bit.module.file.domain.PendingUpload;
import io.github.goraebap.bit.module.file.domain.PendingUploadRepository;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.storage.ObjectStorage;
import io.github.goraebap.bit.shared.storage.StorageStatus;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Uploads go straight from the browser to storage through a signed URL (skill api/04-attachments). The owning module binds
 * them when its command succeeds, in its transaction, after this checks what storage really holds: the size and the
 * format's first bytes (D-090); only a member's or workspace's picture is decoded whole.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileService implements FileFacade {
    /** How long a browser has to send the bytes after asking. */
    static final Duration UPLOAD_TTL = Duration.ofMinutes(10);
    /** How long an opened URL stays usable; each open asks again after authorization. */
    static final Duration OPEN_TTL = Duration.ofMinutes(5);
    /** Uploads cleaned in one run at most, so one run stays short. */
    static final int CLEANUP_BATCH = 500;
    /** How long the daily cleanup keeps deleting discarded bytes again. */
    static final Duration DISCARD_RETRIED = Duration.ofDays(7);

    private final PendingUploadRepository pendingUploadRepository;
    private final AttachmentRepository attachmentRepository;
    private final FileQuery fileQuery;
    private final ObjectStorage objectStorage;
    private final StorageStatus storageStatus;
    private final PictureDecoder pictureDecoder;
    private final Clock clock;

    @Override
    public boolean available() {
        return storageStatus.available();
    }

    /** The storage as the server found it when it started, for the instance admin. */
    public FileViews.Storage storage() {
        return new FileViews.Storage(
                storageStatus.adapter().name().toLowerCase(Locale.ROOT),
                storageStatus.bucket(),
                storageStatus.endpoint(),
                storageStatus.keyPrefix(),
                storageStatus.available(),
                storageStatus.problem(),
                storageStatus.checkedAt(),
                storageStatus.maxFileBytes());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, List<AttachedFile>> attachmentsOf(FileOwner owner, Collection<String> ownerIds) {
        if (ownerIds.isEmpty()) return Map.of();
        Map<String, List<AttachedFile>> files = new LinkedHashMap<>();
        fileQuery.findByOwners(owner, ownerIds).forEach(file -> files.computeIfAbsent(
                        file.ownerId(), key -> new ArrayList<>())
                .add(attached(file)));
        return files;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OpenedFile> open(FileOwner owner, String ownerId, String attachmentId) {
        requireAvailable();
        return fileQuery
                .findOne(owner, ownerId, attachmentId)
                .map(file -> new OpenedFile(
                        file.filename(), file.contentType(), file.size(), objectStorage.open(file.storageKey())));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<URI> openUrl(FileOwner owner, String ownerId, String attachmentId, boolean download) {
        requireAvailable();
        return fileQuery
                .findOne(owner, ownerId, attachmentId)
                .map(file -> objectStorage.presignDownload(
                        file.storageKey(), file.filename(), file.contentType(), download, OPEN_TTL));
    }

    /** Records the upload and hands out where to send it; nothing is stored until the browser sends the bytes. */
    @Transactional
    public FileViews.UploadTicket prepare(CurrentUser user, FileRequests.Upload request) {
        requireAvailable();
        var upload = PendingUpload.create(
                request.filename(),
                request.size(),
                user.userId(),
                user.agent(),
                clock.instant(),
                request.purpose(),
                ImageTraits.of(request.dominantColor(), request.width(), request.height()),
                storageStatus.maxFileBytes());
        pendingUploadRepository.save(upload);
        var presigned = objectStorage.presignUpload(
                upload.storageKey(), upload.format().contentType(), upload.size(), UPLOAD_TTL);
        return new FileViews.UploadTicket(
                upload.id(), presigned.url(), presigned.method(), presigned.headers(), presigned.expiresAt());
    }

    @Override
    @Transactional
    public List<AttachedFile> attach(CurrentUser uploader, List<String> uploadIds, FileOwner owner, String ownerId) {
        if (uploadIds.isEmpty()) return List.of();
        requireAvailable();
        var ids = new ArrayList<>(new LinkedHashSet<>(uploadIds));
        Map<String, PendingUpload> found = pendingUploadRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(PendingUpload::id, Function.identity()));
        var now = clock.instant();
        int position = fileQuery.findByOwners(owner, List.of(ownerId)).size();
        var attachments = new ArrayList<Attachment>();
        for (var id : ids) {
            var upload = found.get(id);
            if (upload == null || !upload.uploadedBy(uploader.userId()) || upload.expired(now))
                throw FileErrorCode.FILE_UPLOAD_MISSING.raise();
            var stored = objectStorage.find(upload.storageKey()).orElseThrow(FileErrorCode.FILE_NOT_STORED::raise);
            byte[] start = objectStorage.readStart(upload.storageKey(), FileFormat.SIGNATURE_LENGTH);
            attachments.add(Attachment.bind(
                    upload, owner, ownerId, position++, stored.size(), start, storageStatus.maxFileBytes()));
        }
        attachmentRepository.saveAll(attachments);
        pendingUploadRepository.deleteAllById(ids);
        return attachments.stream().map(FileService::attached).toList();
    }

    @Override
    @Transactional
    public AttachedFile replacePicture(
            CurrentUser uploader, String uploadId, FileOwner owner, String ownerId, int side) {
        requireAvailable();
        var upload = pendingUploadRepository.findAllById(List.of(uploadId)).stream()
                .findFirst()
                .filter(found -> found.uploadedBy(uploader.userId()) && !found.expired(clock.instant()))
                .orElseThrow(FileErrorCode.FILE_UPLOAD_MISSING::raise);
        var stored = objectStorage.find(upload.storageKey()).orElseThrow(FileErrorCode.FILE_NOT_STORED::raise);
        byte[] start = objectStorage.readStart(upload.storageKey(), FileFormat.SIGNATURE_LENGTH);
        // The cheap checks come first, so only a small JPEG is ever read whole and decoded.
        Attachment.requirePicture(upload, stored.size(), start);
        var decoded = pictureDecoder.decode(upload.storageKey(), stored.size());
        var picture = Attachment.bindPicture(
                upload, owner, ownerId, stored.size(), start, decoded.width(), decoded.height(), side);
        var earlier = fileQuery.findByOwners(owner, List.of(ownerId)).stream()
                .map(FileViews.StoredFile::id)
                .toList();
        attachmentRepository.deleteOfOwner(owner, ownerId, earlier, uploader.userId(), uploader.agent());
        // An earlier picture's bytes go with the daily cleanup.
        attachmentRepository.discardBlobs(earlier, uploader.userId(), uploader.agent());
        attachmentRepository.saveAll(List.of(picture));
        pendingUploadRepository.deleteAllById(List.of(uploadId));
        return attached(picture);
    }

    /**
     * The caller may still refuse its command after this, so the bytes go only once the transaction commits; a
     * rolled-back command keeps its files whole.
     */
    @Override
    @Transactional
    public void discard(FileOwner owner, String ownerId, Collection<String> attachmentIds, CurrentUser actor) {
        if (attachmentIds.isEmpty()) return;
        Set<String> wanted = Set.copyOf(attachmentIds);
        var ids = fileQuery.findByOwners(owner, List.of(ownerId)).stream()
                .map(FileViews.StoredFile::id)
                .filter(wanted::contains)
                .toList();
        discardKept(owner, ownerId, ids, actor);
    }

    @Override
    @Transactional
    public void discardAll(FileOwner owner, String ownerId, CurrentUser actor) {
        var ids = fileQuery.findByOwners(owner, List.of(ownerId)).stream()
                .map(FileViews.StoredFile::id)
                .toList();
        discardKept(owner, ownerId, ids, actor);
    }

    @Override
    @Transactional
    public Map<String, String> copy(
            FileOwner owner,
            String fromOwnerId,
            String toOwnerId,
            Collection<String> attachmentIds,
            CurrentUser actor) {
        if (attachmentIds.isEmpty()) return Map.of();
        Set<String> wanted = Set.copyOf(attachmentIds);
        Map<String, String> newIds = new LinkedHashMap<>();
        for (var file : fileQuery.findByOwners(owner, List.of(fromOwnerId)))
            if (wanted.contains(file.id())) newIds.put(file.id(), Ids.newId());
        attachmentRepository.copy(owner, fromOwnerId, toOwnerId, newIds, actor.userId(), actor.agent());
        return newIds;
    }

    /**
     * Removes uploads nobody took within PendingUpload.KEPT, with their bytes, and deletes the bytes of files discarded
     * in the last week again. A storage failure leaves the row for the next run. Does nothing while storage is off.
     */
    @Transactional
    public int cleanUp() {
        if (!storageStatus.available()) return 0;
        var stale =
                pendingUploadRepository.findAllCreatedBefore(clock.instant().minus(PendingUpload.KEPT), CLEANUP_BATCH);
        var removed = new ArrayList<String>();
        for (var upload : stale) {
            if (deleteStored(upload.storageKey())) removed.add(upload.id());
        }
        pendingUploadRepository.deleteAllById(removed);
        // Deleting a missing object succeeds, so bytes already gone cost only a request.
        attachmentRepository
                .discardedKeysSince(clock.instant().minus(DISCARD_RETRIED), CLEANUP_BATCH)
                .forEach(this::deleteStored);
        return removed.size();
    }

    private void discardKept(FileOwner owner, String ownerId, List<String> ids, CurrentUser actor) {
        if (ids.isEmpty()) return;
        attachmentRepository.deleteOfOwner(owner, ownerId, ids, actor.userId(), actor.agent());
        var keys = attachmentRepository.discardBlobs(ids, actor.userId(), actor.agent());
        if (keys.isEmpty() || !storageStatus.available()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                keys.forEach(FileService.this::deleteStored);
            }
        });
    }

    private void requireAvailable() {
        if (!storageStatus.available()) throw FileErrorCode.FILE_STORAGE_NOT_CONFIGURED.raise();
    }

    /** Whether the bytes are gone; a failure is logged and left for the next cleanup. */
    private boolean deleteStored(String key) {
        try {
            objectStorage.delete(key);
            return true;
        } catch (RuntimeException e) {
            // S3 and file system failures arrive as different runtime exceptions; each means "try again tomorrow".
            log.warn("저장소에서 파일을 지우지 못했습니다: {}", key, e);
            return false;
        }
    }

    private static AttachedFile attached(Attachment attachment) {
        return new AttachedFile(
                attachment.id(),
                attachment.filename(),
                attachment.format().contentType(),
                attachment.size(),
                attachment.format().image(),
                attachment.traits().dominantColor(),
                attachment.traits().width(),
                attachment.traits().height());
    }

    private static AttachedFile attached(FileViews.StoredFile file) {
        boolean image = FileFormat.ofContentType(file.contentType())
                .map(FileFormat::image)
                .orElse(false);
        return new AttachedFile(
                file.id(),
                file.filename(),
                file.contentType(),
                file.size(),
                image,
                file.dominantColor(),
                file.width(),
                file.height());
    }
}
