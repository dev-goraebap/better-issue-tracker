package io.github.goraebap.bit.module.document.domain;

/** The visible text of a page's entry file, whitespace collapsed, cut to what a document body holds. */
public record PageText(String value) {
    public PageText {
        value = value == null ? "" : value.strip();
        if (value.length() > Document.BODY_MAX) {
            int end = Document.BODY_MAX;
            if (Character.isHighSurrogate(value.charAt(end - 1))) end--;
            value = value.substring(0, end);
        }
    }
}
