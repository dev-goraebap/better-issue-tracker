package io.github.goraebap.bit.module.file;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The files a Markdown text, such as a work item's description or a comment, shows. It keeps them as links to
 * {@code attachment:<id>}: {@code ![사진.png](attachment:…)} for a picture shown in place and
 * {@code [자료.pdf](attachment:…)} for a file block. The id is the owner's attachment, which keeps its upload's id.
 */
public final class DocumentFiles {
    private static final Pattern LINK = Pattern.compile("\\]\\(attachment:([A-Za-z][A-Za-z0-9]{9})\\)");

    private DocumentFiles() {}

    /** The files the text points at, in the order it first does. */
    public static Set<String> referencedIn(String markdown) {
        Set<String> ids = new LinkedHashSet<>();
        if (markdown == null) return ids;
        Matcher matcher = LINK.matcher(markdown);
        while (matcher.find()) ids.add(matcher.group(1));
        return ids;
    }

    /** The text pointing at the new ids instead of the old ones they were copied from; other links stay. */
    public static String repoint(String markdown, Map<String, String> newIds) {
        if (markdown == null || newIds.isEmpty()) return markdown;
        return LINK.matcher(markdown).replaceAll(match -> {
            var to = newIds.get(match.group(1));
            return Matcher.quoteReplacement(to == null ? match.group() : "](attachment:" + to + ")");
        });
    }
}
