package io.github.goraebap.bit.module.file;

/**
 * A file bound to an owner, as lists show it. image tells whether a browser can show it as a picture; a picture may
 * carry the colour to paint its place with (#rrggbb) and its size in pixels, each missing when never measured (D-090).
 */
@io.swagger.v3.oas.annotations.media.Schema(requiredProperties = {"id", "filename", "contentType", "size", "image"})
public record AttachedFile(
        String id,
        String filename,
        String contentType,
        long size,
        boolean image,
        String dominantColor,
        Integer width,
        Integer height) {}
