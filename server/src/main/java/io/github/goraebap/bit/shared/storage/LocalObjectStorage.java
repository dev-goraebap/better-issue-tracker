package io.github.goraebap.bit.shared.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Objects as files under a folder on this machine, so a plain Docker run keeps files without a storage service (D-029).
 * The signed URLs point at this server (LocalStorageController) and carry an HMAC of what they allow, its expiry and,
 * for an upload, the content type and size, so they work the way S3's do: whoever holds one may do that one thing until
 * it expires. Each object keeps its content type beside it in a .type file.
 */
public final class LocalObjectStorage implements ObjectStorage {
    /** Where browsers send and open files kept on this machine. */
    public static final String PATH = "/api/v1/storage";

    private static final String TYPE = ".type";

    private final Path root;
    private final byte[] secret;
    private final Clock clock;

    public LocalObjectStorage(Path root, String secret, Clock clock) {
        this.root = root.toAbsolutePath().normalize();
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.clock = clock;
    }

    @Override
    public PresignedUpload presignUpload(String key, String contentType, long size, Duration ttl) {
        Instant expires = clock.instant().plus(ttl);
        String query = query(Map.of("key", key, "type", contentType, "size", Long.toString(size)), "PUT", expires);
        return new PresignedUpload(URI.create(PATH + "?" + query), "PUT", Map.of("Content-Type", contentType), expires);
    }

    @Override
    public URI presignDownload(String key, String filename, String contentType, boolean download, Duration ttl) {
        String query = query(
                Map.of("key", key, "type", contentType, "disposition", Disposition.of(filename, download)),
                "GET",
                clock.instant().plus(ttl));
        return URI.create(PATH + "?" + query);
    }

    @Override
    public Optional<StoredObject> find(String key) {
        Path file = file(key);
        if (!Files.isRegularFile(file)) return Optional.empty();
        try {
            return Optional.of(new StoredObject(Files.size(file), Files.readString(typeOf(file))));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public byte[] readStart(String key, int length) {
        try (InputStream in = open(key)) {
            return in.readNBytes(length);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public InputStream open(String key) {
        try {
            return Files.newInputStream(file(key));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String key) {
        Path file = file(key);
        try {
            Files.deleteIfExists(file);
            Files.deleteIfExists(typeOf(file));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** The folder exists, or can be made, and takes a file. */
    @Override
    public void check() {
        try {
            Files.createDirectories(root);
            Path probe = Files.createTempFile(root, ".check", null);
            Files.delete(probe);
        } catch (IOException e) {
            throw new IllegalStateException("파일 폴더에 쓸 수 없습니다: " + root, e);
        }
    }

    @Override
    public void put(String key, String contentType, long size, InputStream body) {
        if (!write(key, contentType, size, body))
            throw new IllegalStateException("the body did not give the size it was stored with");
    }

    /** Stores what a signed upload sends, after checking the URL allows exactly that. */
    void put(Map<String, String> params, String contentType, long length, InputStream body) {
        String key = verified(params, "PUT", "key", "type", "size");
        if (!params.get("type").equals(contentType) || Long.parseLong(params.get("size")) != length)
            throw new Refused("the upload is not the one this URL allows");
        if (!write(key, contentType, length, body)) throw new Refused("the upload is not the one this URL allows");
    }

    /** Writes the object whole or not at all; false (and nothing kept) when body gives other than length bytes. */
    private boolean write(String key, String contentType, long length, InputStream body) {
        Path file = file(key);
        try {
            Files.createDirectories(Objects.requireNonNull(file.getParent()));
            Path partial = file.resolveSibling(file.getFileName() + ".part");
            Files.copy(body, partial, StandardCopyOption.REPLACE_EXISTING);
            if (Files.size(partial) != length) {
                Files.delete(partial);
                return false;
            }
            Files.writeString(typeOf(file), contentType);
            Files.move(partial, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            return true;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** What a signed download opens: the object with the type and disposition the URL was made with. */
    Optional<Download> get(Map<String, String> params) {
        String key = verified(params, "GET", "key", "type", "disposition");
        if (find(key).isEmpty()) return Optional.empty();
        return Optional.of(new Download(file(key), params.get("type"), params.get("disposition")));
    }

    record Download(Path file, String contentType, String disposition) {}

    /** A URL that is altered, expired or for another operation. */
    static final class Refused extends RuntimeException {
        private static final long serialVersionUID = 1L;

        Refused(String message) {
            super(message);
        }
    }

    private String query(Map<String, String> allowed, String method, Instant expires) {
        var ordered = new TreeMap<>(allowed);
        ordered.put("expires", Long.toString(expires.getEpochSecond()));
        StringBuilder query = new StringBuilder();
        ordered.forEach((name, value) -> query.append(name)
                .append('=')
                .append(URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20"))
                .append('&'));
        return query.append("signature=").append(sign(method, ordered)).toString();
    }

    private String verified(Map<String, String> params, String method, String... names) {
        var signed = new TreeMap<String, String>();
        for (String name : names) {
            String value = params.get(name);
            if (value == null) throw new Refused("the URL is incomplete");
            signed.put(name, value);
        }
        String expires = params.get("expires");
        String signature = params.get("signature");
        if (expires == null || signature == null) throw new Refused("the URL is incomplete");
        signed.put("expires", expires);
        if (!MessageDigest.isEqual(
                sign(method, signed).getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8)))
            throw new Refused("the URL is not one this server made");
        long until;
        try {
            until = Long.parseLong(expires);
        } catch (NumberFormatException e) {
            throw new Refused("the URL is not one this server made");
        }
        if (clock.instant().getEpochSecond() > until) throw new Refused("the URL has expired");
        return signed.get("key");
    }

    private String sign(String method, Map<String, String> values) {
        StringBuilder text = new StringBuilder(method);
        values.forEach(
                (name, value) -> text.append('\n').append(name).append('=').append(value));
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] digest = mac.doFinal(text.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    /** The key's file, kept inside the folder whatever the key holds. */
    private Path file(String key) {
        String name = HexFormat.of().formatHex(key.getBytes(StandardCharsets.UTF_8));
        // Hex keeps any key a plain file name; the first two characters fan the files out into folders.
        return root.resolve(name.substring(0, Math.min(2, name.length()))).resolve(name);
    }

    private static Path typeOf(Path file) {
        return file.resolveSibling(file.getFileName() + TYPE);
    }
}
