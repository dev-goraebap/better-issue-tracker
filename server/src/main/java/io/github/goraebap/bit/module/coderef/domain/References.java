package io.github.goraebap.bit.module.coderef.domain;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Issue keys written in a repository (D-087): `BIT-42` in a commit message, a pull request's title or body, or a
 * branch (`bit-42-login-fix`, `feature/BIT-42`), in any letter case; and `#61` or `Closes #61` naming the repository's
 * own issue. Matching a key to a project is the caller's (its current key or an old one).
 */
public final class References {
    private static final Pattern KEY =
            Pattern.compile("(?i)(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9]{1,9})-([1-9][0-9]{0,8})(?![A-Za-z0-9])");
    private static final Pattern HASH = Pattern.compile("(?<![\\w/])#([1-9][0-9]{0,9})\\b");
    private static final String BOT_MARK = "<!-- bit:";

    private References() {}

    /** The keys a text names, upper-cased, in order of first mention. */
    public static Set<String> keys(String text) {
        var found = new LinkedHashSet<String>();
        if (text == null) return found;
        var match = KEY.matcher(text);
        while (match.find()) found.add(match.group(1).toUpperCase(Locale.ROOT) + "-" + match.group(2));
        return found;
    }

    /** The repository issue numbers a text names with #. */
    public static Set<String> numbers(String text) {
        var found = new LinkedHashSet<String>();
        if (text == null) return found;
        var match = HASH.matcher(text);
        while (match.find()) found.add(match.group(1));
        return found;
    }

    /** The hidden mark BIT puts in what it writes to a repository, so the webhook that echoes it back is skipped. */
    public static String mark(String kind, String id) {
        return BOT_MARK + kind + ":" + id + " -->";
    }

    public static boolean fromBit(String text) {
        return text != null && text.contains(BOT_MARK);
    }

    /** A body as BIT keeps it: without the hidden marks and the link line BIT added after them. */
    public static String withoutMarks(String text) {
        if (text == null) return null;
        int at = text.indexOf("\n\n---\n" + BOT_MARK);
        if (at < 0) at = text.indexOf(BOT_MARK);
        return (at < 0 ? text : text.substring(0, at)).strip();
    }
}
