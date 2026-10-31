package io.github.goraebap.bit.module.document.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

/** A bundle read whole and found sound: its files by path (top folder stripped, junk dropped), its entry, warnings. */
public record PageBundle(List<SpooledFile> files, PagePath entry, List<String> warnings) {
    public static final String DEFAULT_ENTRY = "index.html";
    private static final int NAMED = 10;

    public PageBundle {
        files = List.copyOf(files);
        warnings = List.copyOf(warnings);
    }

    /**
     * Checks the unpacked files as a whole. A single top folder that every file sits in is stripped (with a warning).
     * Two paths may not differ only by case, and a name may not be a file and a folder at once. The entry is the given
     * path, else index.html at the top, else the only HTML file; it must exist and be HTML.
     */
    public static PageBundle of(List<SpooledFile> unpacked, Optional<String> entry, List<String> warnings) {
        if (unpacked.isEmpty()) throw new PageBundleRejected("zip에 페이지 파일이 없습니다");
        var notes = new ArrayList<>(warnings);
        var files = new ArrayList<>(unpacked);
        String top = files.getFirst().path().firstSegment();
        boolean shared = files.stream()
                .allMatch(file ->
                        file.path().nested() && file.path().firstSegment().equals(top));
        if (shared) {
            files.replaceAll(file -> file.withPath(file.path().withoutFirstSegment()));
            notes.add(top + "/ 폴더를 묶음의 맨 위로 보았습니다");
        }
        files.sort(Comparator.comparing(file -> file.path().value()));
        var byFolded = new HashMap<String, SpooledFile>();
        for (var file : files) {
            var other = byFolded.putIfAbsent(file.path().folded(), file);
            if (other != null)
                throw new PageBundleRejected("zip 안에 대소문자만 다르거나 같은 경로가 있습니다: "
                        + other.path().value() + ", " + file.path().value());
        }
        var folders = new HashSet<String>();
        files.forEach(file -> folders.addAll(file.path().foldedFolders()));
        for (var file : files)
            if (folders.contains(file.path().folded()))
                throw new PageBundleRejected("zip 안 '" + file.path().value() + "'가 파일이면서 폴더입니다");
        return new PageBundle(files, entry(files, entry, shared ? top : null), notes);
    }

    private static PagePath entry(List<SpooledFile> files, Optional<String> given, String stripped) {
        var html = files.stream().filter(file -> file.type().html()).toList();
        if (given.isPresent() && !given.get().isBlank()) {
            String wanted = given.get().strip();
            if (stripped != null && wanted.startsWith(stripped + "/")) wanted = wanted.substring(stripped.length() + 1);
            var path = PagePath.parse(wanted);
            var found = files.stream()
                    .filter(file -> file.path().equals(path))
                    .findFirst()
                    .orElseThrow(() ->
                            new PageBundleRejected("시작 파일 '" + given.get() + "'가 묶음에 없습니다. HTML 파일: " + names(html)));
            if (!found.type().html()) throw new PageBundleRejected("시작 파일 '" + given.get() + "'가 HTML이 아닙니다");
            return path;
        }
        var index = files.stream()
                .filter(file -> file.path().value().equals(DEFAULT_ENTRY))
                .findFirst();
        if (index.isPresent()) return index.get().path();
        if (html.size() == 1) return html.getFirst().path();
        if (html.isEmpty()) throw new PageBundleRejected("묶음에 HTML 파일이 없습니다");
        throw new PageBundleRejected("맨 위에 index.html이 없어 시작 파일을 정할 수 없습니다. entry로 하나를 골라 주세요: " + names(html));
    }

    private static String names(List<SpooledFile> html) {
        if (html.isEmpty()) return "없음";
        var names = html.stream().limit(NAMED).map(file -> file.path().value()).toList();
        return String.join(", ", names) + (html.size() > NAMED ? " 외 " + (html.size() - NAMED) + "개" : "");
    }
}
