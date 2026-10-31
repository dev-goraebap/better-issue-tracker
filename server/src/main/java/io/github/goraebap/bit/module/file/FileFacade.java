package io.github.goraebap.bit.module.file;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.io.InputStream;
import java.net.URI;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Files other modules bind to what they own (skill api/04-attachments). The file module checks uploads and stores the link;
 * the owning module decides who may open an owner's files before asking for a URL, since only it knows who may see the
 * owner. While storage is off (D-030) every call that needs it raises FILE_STORAGE_NOT_CONFIGURED.
 */
public interface FileFacade {
    /** Whether files can be sent and opened now; the server's capabilities say the same. */
    boolean available();

    /**
     * Binds the member's finished uploads, in the given order, after the owner's own files, within the caller's
     * transaction; each file keeps its upload's id, so a text can point at it before it is saved. Refuses uploads that
     * are missing, someone else's, expired, not stored, larger than the limit, or whose content does not start as
     * their format does.
     */
    List<AttachedFile> attach(CurrentUser uploader, List<String> uploadIds, FileOwner owner, String ownerId);

    /**
     * Makes the member's finished upload the owner's only picture, a JPEG square of side pixels, and discards the
     * owner's earlier files; their bytes go with the daily cleanup. Refuses what attach refuses, and a file that does
     * not decode whole to that size.
     */
    AttachedFile replacePicture(CurrentUser uploader, String uploadId, FileOwner owner, String ownerId, int side);

    /** One of the owner's files as a stream, empty when the owner has no such file; the caller closes it. */
    Optional<OpenedFile> open(FileOwner owner, String ownerId, String attachmentId);

    /** A file being read: what it is called, its type and size, and its bytes. */
    record OpenedFile(String filename, String contentType, long size, InputStream body) {}

    /**
     * A short-lived URL for one of the owner's files, empty when the owner has no such file. The caller has already
     * checked that the member may see the owner.
     */
    Optional<URI> openUrl(FileOwner owner, String ownerId, String attachmentId, boolean download);

    /** The files of each owner in their order, in one batch; owners without files are left out. */
    Map<String, List<AttachedFile>> attachmentsOf(FileOwner owner, Collection<String> ownerIds);

    /**
     * Removes the given files of the owner, bytes included, once the caller's transaction commits; ids that are not the
     * owner's are ignored. The daily cleanup deletes the bytes again for a week, so a storage failure is retried.
     */
    void discard(FileOwner owner, String ownerId, Collection<String> attachmentIds, CurrentUser actor);

    /** Removes every file of the owner, as discard does, when the owner is no longer kept. */
    void discardAll(FileOwner owner, String ownerId, CurrentUser actor);

    /**
     * Gives another owner of the same kind its own copy of the given files of an owner, sharing their bytes, after its
     * own files. Returns each copied file's new id by the id it was copied from; ids the owner does not keep are left
     * out. Discarding either copy leaves the other's bytes.
     */
    Map<String, String> copy(
            FileOwner owner, String fromOwnerId, String toOwnerId, Collection<String> attachmentIds, CurrentUser actor);

    /**
     * The member's finished page upload (purpose page) as a zip stream, after the checks attach makes: theirs, not
     * expired, stored, within the attachment limit, starting as a zip does. It does not use the upload up: the daily
     * cleanup removes it a day after it was made, and the caller keeps one upload from making two things. The caller
     * closes the stream.
     */
    InputStream openBundle(CurrentUser uploader, String uploadId);

    /**
     * Keeps files the server read itself as blobs with no attachment, and returns their blobs in the given order. Equal
     * bytes are kept once (key blobs/sha256/hex): the same content always gets the same blob, so a repeated call adopts
     * what an earlier one stored, and versions sharing a file share its blob. Kept blobs are never cleaned up. Call it
     * outside a transaction: it writes to storage first and then adds the rows in one statement.
     */
    List<KeptBlob> keep(CurrentUser actor, List<KeptFile> files);

    /** A kept blob's bytes; the caller has checked that the member may read what holds it, and closes the stream. */
    InputStream openKept(String blobId);
}
