package io.github.goraebap.bit.module.file;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * A member's avatar or a workspace's logo as screens show it (D-090, BIT-30): its id, which its address holds so a
 * browser may keep the bytes for good, and the colour to paint its place with until they arrive (missing when the
 * browser did not measure it). An owner keeps one picture, a JPEG square of {@link #SIDE} pixels.
 */
@Schema(
        name = "Picture",
        requiredProperties = {"id"})
public record Picture(
        String id, @Schema(types = {"string", "null"}) String color) {
    public static final int SIDE = 512;

    public static Picture of(AttachedFile file) {
        return new Picture(file.id(), file.dominantColor());
    }

    /** Each owner's picture, from its files (replacePicture leaves one); owners without one are left out. */
    public static Map<String, Picture> byOwner(Map<String, List<AttachedFile>> files) {
        var pictures = new HashMap<String, Picture>();
        files.forEach((owner, list) -> {
            if (!list.isEmpty()) pictures.put(owner, of(list.getFirst()));
        });
        return pictures;
    }
}
