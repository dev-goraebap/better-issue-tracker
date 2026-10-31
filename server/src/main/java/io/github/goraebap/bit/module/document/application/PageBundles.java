package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.PageBundle;
import io.github.goraebap.bit.module.document.domain.PageBundleRejected;
import io.github.goraebap.bit.module.document.domain.PageFile;
import io.github.goraebap.bit.module.document.domain.PageFileType;
import io.github.goraebap.bit.module.document.domain.PageHtml;
import io.github.goraebap.bit.module.document.domain.PageLimits;
import io.github.goraebap.bit.module.document.domain.PagePath;
import io.github.goraebap.bit.module.document.domain.SpooledFile;
import io.github.goraebap.bit.module.document.domain.StoredBundle;
import io.github.goraebap.bit.module.file.FileFacade;
import io.github.goraebap.bit.module.file.KeptFile;
import io.github.goraebap.bit.shared.storage.StorageStatus;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.io.Writer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipException;
import java.util.zip.ZipFile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Reads one page upload whole into a local spool, checks all of it, and only then keeps its files. Nothing here runs
 * in a transaction: unzipping and storage writes would otherwise hold SQLite's one write lock.
 */
@Slf4j
@Component
class PageBundles {
    /** Leftovers of a crash mid-upload older than this go when the server starts. */
    static final Duration SPOOL_KEPT = Duration.ofHours(1);

    private static final int NAMED = 5;
    private final FileFacade fileFacade;
    private final StorageStatus storageStatus;
    private final Clock clock;
    private final Path spoolRoot;

    PageBundles(FileFacade fileFacade, StorageStatus storageStatus, Clock clock) {
        this.fileFacade = fileFacade;
        this.storageStatus = storageStatus;
        this.clock = clock;
        this.spoolRoot = Path.of(System.getProperty("java.io.tmpdir"), "bit-page-spool");
        removeLeftovers();
    }

    StoredBundle store(CurrentUser actor, String uploadId, Optional<String> entry) {
        var limits = PageLimits.forAttachmentLimit(storageStatus.maxFileBytes());
        Path folder = spool();
        try {
            Path archive = folder.resolve("bundle.zip");
            try (InputStream zip = fileFacade.openBundle(actor, uploadId)) {
                Files.copy(zip, archive);
            }
            var warnings = new ArrayList<String>();
            var bundle = PageBundle.of(unpack(archive, limits, folder, warnings), entry, warnings);
            var facts = new HashMap<PagePath, PageHtml.Facts>();
            var external = new LinkedHashSet<String>();
            for (var file : bundle.files()) {
                if (file.type().html()) {
                    if (file.size() > limits.htmlBytes())
                        throw new PageBundleRejected("HTML 파일 '" + file.path().value() + "'는 "
                                + megabytes(limits.htmlBytes()) + "까지 올릴 수 있습니다");
                    var read = PageHtml.inspect(
                            file.path(),
                            Files.readAllBytes(file.spooled()),
                            file.path().equals(bundle.entry()));
                    facts.put(file.path(), read);
                    external.addAll(read.externalUrls());
                } else if (file.type() == PageFileType.CSS)
                    external.addAll(PageHtml.cssUrls(Files.readString(file.spooled())));
            }
            var notes = new ArrayList<>(bundle.warnings());
            if (!external.isEmpty()) notes.add(externalWarning(external));
            var nonEmpty =
                    bundle.files().stream().filter(file -> file.size() > 0).toList();
            var kept = fileFacade.keep(
                    actor,
                    nonEmpty.stream()
                            .map(file -> new KeptFile(
                                    file.spooled(),
                                    file.path().fileName(),
                                    file.type().contentType()))
                            .toList());
            var blobs = new HashMap<PagePath, String>();
            for (int i = 0; i < nonEmpty.size(); i++)
                blobs.put(nonEmpty.get(i).path(), kept.get(i).blobId());
            var files = bundle.files().stream()
                    .map(file -> new PageFile(
                            file.path(),
                            file.type(),
                            file.size(),
                            blobs.get(file.path()),
                            file.type().html() ? (long) facts.get(file.path()).injectAt() : null))
                    .toList();
            var text = facts.get(bundle.entry()).text().orElseThrow();
            return new StoredBundle(bundle.entry(), files, text, notes);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            delete(folder);
        }
    }

    /**
     * Unpacks through the zip's central directory, so stored entries with data descriptors read too; names must be
     * UTF-8. Directories and junk are skipped; every other entry must be a page file. The actual inflated bytes are
     * counted, never the sizes the zip declares, and text kinds must be strict UTF-8.
     */
    private List<SpooledFile> unpack(Path archive, PageLimits limits, Path folder, List<String> warnings)
            throws IOException {
        ZipFile zip;
        try {
            zip = new ZipFile(archive.toFile(), StandardCharsets.UTF_8);
        } catch (ZipException unreadable) {
            throw new PageBundleRejected("zip을 읽을 수 없습니다(깨진 zip, 암호, UTF-8이 아닌 파일 이름): " + unreadable.getMessage());
        }
        try (zip) {
            // Folders count as entries too, so the quick refusal leaves room for them.
            if (zip.size() > limits.files() * 2L) throw tooMany(limits);
            var files = new ArrayList<SpooledFile>();
            var junk = new ArrayList<String>();
            long total = 0;
            var entries = zip.entries();
            while (entries.hasMoreElements()) {
                var entry = entries.nextElement();
                if (entry.isDirectory()) continue;
                if (PagePath.isJunk(entry.getName())) {
                    junk.add(entry.getName());
                    continue;
                }
                var path = PagePath.parse(entry.getName());
                var type = PageFileType.of(path)
                        .orElseThrow(() -> new PageBundleRejected(
                                "zip 안 '" + path.value() + "': 올릴 수 없는 형식입니다. 쓸 수 있는 형식: " + PageFileType.allowed()));
                if (files.size() >= limits.files()) throw tooMany(limits);
                Path target = folder.resolve(Integer.toString(files.size()));
                long size;
                try (InputStream in = zip.getInputStream(entry);
                        OutputStream out = Files.newOutputStream(target)) {
                    size = copy(in, out, limits.unpackedBytes() - total, limits);
                } catch (ZipException broken) {
                    throw new PageBundleRejected("zip 안 '" + path.value() + "'를 풀 수 없습니다: " + broken.getMessage());
                }
                total += size;
                if (type.text()) requireUtf8(target, path);
                files.add(new SpooledFile(path, type, size, target));
            }
            if (!junk.isEmpty())
                warnings.add("묶음에서 뺀 파일 " + junk.size() + "개: "
                        + String.join(", ", junk.subList(0, Math.min(NAMED, junk.size())))
                        + (junk.size() > NAMED ? " 등" : ""));
            return files;
        }
    }

    private static long copy(InputStream in, OutputStream out, long remaining, PageLimits limits) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        long copied = 0;
        for (int read; (read = in.read(buffer)) >= 0; ) {
            copied += read;
            if (copied > remaining)
                throw new PageBundleRejected("묶음을 푼 크기가 " + megabytes(limits.unpackedBytes()) + "를 넘습니다");
            out.write(buffer, 0, read);
        }
        return copied;
    }

    private static void requireUtf8(Path file, PagePath path) throws IOException {
        var decoder = StandardCharsets.UTF_8
                .newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        try (Reader reader = new InputStreamReader(Files.newInputStream(file), decoder)) {
            reader.transferTo(Writer.nullWriter());
        } catch (CharacterCodingException notUtf8) {
            throw new PageBundleRejected("zip 안 '" + path.value() + "'가 UTF-8이 아닙니다. UTF-8로 저장해 주세요");
        }
    }

    private static String externalWarning(LinkedHashSet<String> urls) {
        var named = urls.stream().limit(NAMED).toList();
        boolean pretendard = urls.stream()
                .anyMatch(url -> url.toLowerCase(java.util.Locale.ROOT).contains("pretendard"));
        return "외부 주소는 BIT에서 막힙니다: " + String.join(", ", named)
                + (urls.size() > NAMED ? " 외 " + (urls.size() - NAMED) + "개" : "")
                + (pretendard ? " (Pretendard 글꼴은 BIT가 대신 줍니다)" : "");
    }

    private static PageBundleRejected tooMany(PageLimits limits) {
        return new PageBundleRejected("묶음에는 파일을 " + limits.files() + "개까지 둘 수 있습니다");
    }

    private static String megabytes(long bytes) {
        return (bytes / (1024L * 1024)) + "MB";
    }

    private Path spool() {
        try {
            Files.createDirectories(spoolRoot);
            return Files.createTempDirectory(spoolRoot, "upload");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private void removeLeftovers() {
        if (!Files.isDirectory(spoolRoot)) return;
        var before = clock.instant().minus(SPOOL_KEPT);
        try (var folders = Files.list(spoolRoot)) {
            folders.filter(folder -> {
                        try {
                            return Files.getLastModifiedTime(folder).toInstant().isBefore(before);
                        } catch (IOException e) {
                            return false;
                        }
                    })
                    .forEach(PageBundles::delete);
        } catch (IOException e) {
            log.warn("페이지 묶음 임시 폴더를 정리하지 못했습니다: {}", spoolRoot, e);
        }
    }

    private static void delete(Path folder) {
        try (var paths = Files.walk(folder)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException e) {
                    log.warn("페이지 묶음 임시 파일을 지우지 못했습니다: {}", path, e);
                }
            });
        } catch (IOException e) {
            log.warn("페이지 묶음 임시 폴더를 지우지 못했습니다: {}", folder, e);
        }
    }
}
