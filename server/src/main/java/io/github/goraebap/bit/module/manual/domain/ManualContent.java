package io.github.goraebap.bit.module.manual.domain;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;

/** One ordered book, changed atomically; images are owned attachments, never embedded in this value. */
public record ManualContent(List<Section> sections, List<Page> pages, List<Comment> comments) {
    public ManualContent {
        if (sections == null
                || pages == null
                || comments == null
                || sections.stream().anyMatch(java.util.Objects::isNull)
                || pages.stream().anyMatch(java.util.Objects::isNull)
                || comments.stream().anyMatch(java.util.Objects::isNull))
            throw new IllegalArgumentException("Manual arrays must contain valid items");
        sections = List.copyOf(sections);
        pages = List.copyOf(pages);
        comments = List.copyOf(comments);
    }

    public record Section(String id, String title) {}

    public record Page(String id, String title, String body, String sectionId, Instant updatedAt) {}

    public record Comment(
            String id,
            String pageId,
            String body,
            boolean resolved,
            Instant createdAt,
            String authorId,
            String authorName,
            String agentName,
            Instant resolvedAt,
            String resolvedBy) {}

    public static ManualContent of(List<Section> sections, List<Page> pages, List<Comment> comments) {
        if (sections == null || pages == null || comments == null)
            throw new IllegalArgumentException("Manual arrays are required");
        if (sections.size() > 100 || pages.size() > 500 || comments.size() > 2000)
            throw new IllegalArgumentException("Manual too large");
        var sectionIds = new HashSet<String>();
        for (var section : sections) {
            if (section == null) throw new IllegalArgumentException("Invalid section");
            identifier(section.id());
            text(section.title(), 100);
            if (!sectionIds.add(section.id())) throw new IllegalArgumentException("Duplicate section");
        }
        var pageIds = new HashSet<String>();
        int total = 0;
        for (var page : pages) {
            if (page == null || page.body() == null) throw new IllegalArgumentException("Invalid page");
            identifier(page.id());
            text(page.title(), 160);
            if (page.body().length() > 200_000
                    || !pageIds.add(page.id())
                    || page.sectionId() == null
                    || !page.sectionId().isEmpty() && !sectionIds.contains(page.sectionId()))
                throw new IllegalArgumentException("Invalid page");
            total += page.body().length();
        }
        if (total > 5_000_000) throw new IllegalArgumentException("Manual text too large");
        var commentIds = new HashSet<String>();
        int commentBytes = 0;
        for (var comment : comments) {
            if (comment == null) throw new IllegalArgumentException("Invalid comment");
            identifier(comment.id());
            text(comment.body(), 20_000);
            commentBytes += comment.body().length();
            if (!pageIds.contains(comment.pageId()) || !commentIds.add(comment.id()))
                throw new IllegalArgumentException("Invalid comment");
        }
        if (commentBytes > 2_000_000) throw new IllegalArgumentException("Manual comments too large");
        return new ManualContent(List.copyOf(sections), List.copyOf(pages), List.copyOf(comments));
    }

    public static void identifier(String value) {
        if (value == null || !value.matches("[A-Za-z][A-Za-z0-9_-]{0,79}"))
            throw new IllegalArgumentException("Invalid manual item id");
    }

    public static String text(String value, int max) {
        if (value == null || value.isBlank() || value.length() > max)
            throw new IllegalArgumentException("Invalid text");
        return value.strip();
    }
}
