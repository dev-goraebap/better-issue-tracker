package io.github.goraebap.bit.module.link.domain;

import java.net.URI;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Pattern;

/** Only inline Markdown links to this instance; code examples and images are not references. */
public final class DocumentReferences {
    private static final Pattern LINKS = Pattern.compile("(?<!!)\\[[^\\]\\n]*]\\(<?([^\\s)>]+)>?(?:\\s+[^)]*)?\\)");
    private static final Pattern PATH =
            Pattern.compile("/workspaces/([A-Za-z][A-Za-z0-9]{9})/documents/(?:[^/]*-)?([A-Za-z][A-Za-z0-9]{9})/?");

    private DocumentReferences() {}

    public static Set<String> ids(String body, String workspace, Set<String> origins) {
        String prose = body.replaceAll("(?ms)^\\s*(```|~~~).*?^\\s*\\1[^\\n]*(?:\\n|$)", "")
                .replaceAll("`[^`\\n]*`", "");
        var result = new LinkedHashSet<String>();
        var links = LINKS.matcher(prose);
        while (links.find())
            try {
                URI uri = URI.create(links.group(1));
                if (uri.getRawAuthority() != null
                        && (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                                || !origins.contains(uri.getScheme() + "://" + uri.getRawAuthority()))) continue;
                if (uri.isAbsolute() && uri.getRawAuthority() == null) continue;
                var path = PATH.matcher(uri.getPath());
                if (path.matches() && path.group(1).equals(workspace)) result.add(path.group(2));
            } catch (IllegalArgumentException ignored) {
                /* A malformed external link stays ordinary Markdown. */
            }
        return Set.copyOf(result);
    }
}
