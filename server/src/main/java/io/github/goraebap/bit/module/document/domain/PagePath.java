package io.github.goraebap.bit.module.document.domain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/**
 * A file's place in a page bundle: relative, '/'-separated, NFC, at most MAX characters, and loadable by a relative URL
 * exactly as written. Korean names are fine. Refused: empty, '.' or '..' segments, a leading '/', a drive letter,
 * control characters, hidden segments (a leading '.'), and every character the server's firewall, Tomcat or URL
 * resolution would break.
 */
public record PagePath(String value) {
    public static final int MAX = 512;
    public static final int SEGMENT_MAX = 255;

    /** ';' '%' '//' are refused by the firewall, '?' '#' end a URL path, ':' reads as a scheme, the rest Tomcat refuses. */
    private static final String FORBIDDEN = "\\;%?#:*\"<>|[]^{}`";

    private static final Set<String> JUNK_FILES = Set.of(".ds_store", "thumbs.db", "desktop.ini");

    public static PagePath parse(String raw) {
        if (raw == null || raw.isEmpty()) throw new PageBundleRejected("zip 안에 이름 없는 파일이 있습니다");
        String path = Normalizer.normalize(raw, Normalizer.Form.NFC);
        if (path.length() > MAX) throw rejected(path, "경로가 " + MAX + "자보다 깁니다");
        for (int i = 0; i < path.length(); i++) {
            char c = path.charAt(i);
            if (Character.isISOControl(c)) throw rejected(path, "제어 문자가 있습니다");
            if (FORBIDDEN.indexOf(c) >= 0) throw rejected(path, "쓸 수 없는 글자 '" + c + "'가 있습니다");
        }
        if (path.startsWith("/")) throw rejected(path, "절대 경로는 쓸 수 없습니다");
        for (String segment : path.split("/", -1)) {
            if (segment.isEmpty()) throw rejected(path, "빈 경로 조각이 있습니다");
            if (segment.equals(".") || segment.equals("..")) throw rejected(path, "'" + segment + "' 경로는 쓸 수 없습니다");
            if (segment.startsWith(".")) throw rejected(path, "'.'로 시작하는 숨은 파일이나 폴더는 쓸 수 없습니다");
            if (segment.length() > SEGMENT_MAX) throw rejected(path, "이름이 " + SEGMENT_MAX + "자보다 깁니다");
        }
        return new PagePath(path);
    }

    /** __MACOSX/..., ._ files, .DS_Store, Thumbs.db, desktop.ini: left out of the bundle (and named in a warning). */
    public static boolean isJunk(String raw) {
        String path = raw.replace('\\', '/');
        for (String segment : path.split("/")) if (segment.equalsIgnoreCase("__MACOSX")) return true;
        String name = path.substring(path.lastIndexOf('/') + 1).toLowerCase(Locale.ROOT);
        return JUNK_FILES.contains(name) || name.startsWith("._");
    }

    public boolean nested() {
        return value.indexOf('/') >= 0;
    }

    public String firstSegment() {
        int slash = value.indexOf('/');
        return slash < 0 ? value : value.substring(0, slash);
    }

    public PagePath withoutFirstSegment() {
        int slash = value.indexOf('/');
        if (slash < 0) throw new IllegalStateException("A top-level file has no folder to strip");
        return new PagePath(value.substring(slash + 1));
    }

    /** For the case-blind duplicate check: a bundle must unpack the same on Windows and macOS. */
    public String folded() {
        return value.toLowerCase(Locale.ROOT);
    }

    /** The folders the path sits in, folded, from the top: "a/b/c.css" gives "a" and "a/b". */
    public java.util.List<String> foldedFolders() {
        var folders = new java.util.ArrayList<String>();
        String folded = folded();
        for (int slash = folded.indexOf('/'); slash >= 0; slash = folded.indexOf('/', slash + 1))
            folders.add(folded.substring(0, slash));
        return folders;
    }

    public String extension() {
        String name = fileName();
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public String fileName() {
        return value.substring(value.lastIndexOf('/') + 1);
    }

    private static PageBundleRejected rejected(String path, String reason) {
        return new PageBundleRejected("zip 안 '" + path + "': " + reason);
    }
}
