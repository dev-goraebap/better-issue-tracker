package io.github.goraebap.bit.module.document.domain;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;

/** What BIT reads in a bundle's HTML and CSS: where its own tags go, repeated data-bit-ids, external addresses, text. */
public final class PageHtml {
    public static final String BIT_ID = "data-bit-id";

    private static final Pattern EXTERNAL = Pattern.compile("^(?i:https?:)?//.*");
    private static final Pattern CSS_URL =
            Pattern.compile("(?i)(?:url\\(\\s*['\"]?|@import\\s+['\"])((?:https?:)?//[^'\")\\s]+)");
    private static final Set<String> NAVIGATION = Set.of("a", "area");

    private PageHtml() {}

    /** What one HTML file holds that BIT cares about; text only for the entry file. */
    public record Facts(int injectAt, List<String> externalUrls, Optional<PageText> text) {
        public Facts {
            externalUrls = List.copyOf(externalUrls);
        }
    }

    /**
     * Where BIT's own tags go: just after whatever opens the file of a byte order mark, whitespace, comments,
     * {@code <!doctype>}, {@code <html ...>} and {@code <head ...>}, reading tags with quoted attributes (a '>' inside
     * quotes does not end one), case-blind. Never before a doctype, so the page keeps standards mode.
     */
    public static int injectAt(byte[] html) {
        int i = 0;
        int at = 0;
        if (html.length >= 3 && (html[0] & 0xFF) == 0xEF && (html[1] & 0xFF) == 0xBB && (html[2] & 0xFF) == 0xBF) {
            i = 3;
            at = 3;
        }
        while (true) {
            while (i < html.length && isSpace(html[i])) i++;
            if (i >= html.length || html[i] != '<') return at;
            int end;
            if (startsWith(html, i, "<!--")) {
                end = indexOf(html, i + 4, "-->");
                if (end < 0) return at;
                end += 3;
            } else if (startsWith(html, i, "<!doctype") || tagNamed(html, i, "html")) {
                end = tagEnd(html, i);
                if (end < 0) return at;
            } else if (tagNamed(html, i, "head")) {
                end = tagEnd(html, i);
                return end < 0 ? at : end;
            } else return at;
            i = end;
            at = end;
        }
    }

    /**
     * Reads one UTF-8 HTML file. A data-bit-id repeated within it refuses the bundle, naming the file and the id.
     * Addresses on other hosts that the page would load (src, srcset, link href, CSS url() and @import) are collected:
     * the page's CSP blocks them. For the entry file, its visible text without script and style.
     */
    public static Facts inspect(PagePath path, byte[] utf8, boolean entry) {
        int at = injectAt(utf8);
        var document = Jsoup.parse(new String(utf8, StandardCharsets.UTF_8));
        var seen = new HashSet<String>();
        for (Element element : document.getElementsByAttribute(BIT_ID)) {
            String id = element.attr(BIT_ID);
            if (!id.isEmpty() && !seen.add(id))
                throw new PageBundleRejected(
                        path.value() + "에 data-bit-id \"" + id + "\"가 두 번 이상 있습니다. 한 파일 안에서 겹치지 않게 해 주세요");
        }
        var urls = new LinkedHashSet<String>();
        for (Element element : document.getAllElements()) {
            String tag = element.normalName();
            if (element.hasAttr("src")) external(element.attr("src"), urls);
            if (element.hasAttr("poster")) external(element.attr("poster"), urls);
            if (element.hasAttr("href") && !NAVIGATION.contains(tag)) external(element.attr("href"), urls);
            if (element.hasAttr("srcset"))
                for (String candidate : element.attr("srcset").split(","))
                    external(candidate.strip().split("\\s+")[0], urls);
            if (element.hasAttr("style")) urls.addAll(cssUrls(element.attr("style")));
            if (tag.equals("style")) urls.addAll(cssUrls(element.data()));
        }
        Optional<PageText> text =
                entry ? Optional.of(new PageText(document.body().text())) : Optional.empty();
        return new Facts(at, new ArrayList<>(urls), text);
    }

    /** Addresses on other hosts a stylesheet would load. */
    public static List<String> cssUrls(String css) {
        var urls = new ArrayList<String>();
        var matcher = CSS_URL.matcher(css);
        while (matcher.find()) urls.add(matcher.group(1));
        return urls;
    }

    private static void external(String value, Set<String> urls) {
        String url = value.strip();
        if (EXTERNAL.matcher(url).matches()) urls.add(url);
    }

    private static boolean isSpace(byte b) {
        return b == ' ' || b == '\t' || b == '\n' || b == '\r' || b == '\f';
    }

    private static boolean startsWith(byte[] html, int at, String ascii) {
        if (at + ascii.length() > html.length) return false;
        for (int k = 0; k < ascii.length(); k++)
            if (Character.toLowerCase((char) (html[at + k] & 0xFF)) != ascii.charAt(k)) return false;
        return true;
    }

    /** {@code <name} followed by whitespace, '>' or '/'. */
    private static boolean tagNamed(byte[] html, int at, String name) {
        if (!startsWith(html, at, "<" + name.toLowerCase(Locale.ROOT))) return false;
        int next = at + 1 + name.length();
        return next < html.length && (isSpace(html[next]) || html[next] == '>' || html[next] == '/');
    }

    /** The index after the '>' that ends the tag starting at {@code at}, quotes respected; -1 when it never ends. */
    private static int tagEnd(byte[] html, int at) {
        byte quote = 0;
        for (int i = at + 1; i < html.length; i++) {
            byte b = html[i];
            if (quote != 0) {
                if (b == quote) quote = 0;
            } else if (b == '"' || b == '\'') quote = b;
            else if (b == '>') return i + 1;
        }
        return -1;
    }

    private static int indexOf(byte[] html, int from, String ascii) {
        for (int i = from; i + ascii.length() <= html.length; i++) if (startsWith(html, i, ascii)) return i;
        return -1;
    }
}
