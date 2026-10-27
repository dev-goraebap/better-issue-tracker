package io.github.goraebap.bit.module.file;

import java.util.List;

/** Portable body references; permission is checked by the owner's file opening endpoint. */
public final class AttachmentMarkdown {
    private AttachmentMarkdown() {}

    public static String append(String body, List<AttachedFile> files) {
        StringBuilder text = new StringBuilder(body == null ? "" : body.stripTrailing());
        for (var file : files) {
            if (!text.isEmpty()) text.append("\n\n");
            String name =
                    file.filename().replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]");
            text.append(file.image() ? "!" : "")
                    .append('[')
                    .append(name)
                    .append("](attachment:")
                    .append(file.id())
                    .append(')');
        }
        return text.toString();
    }
}
