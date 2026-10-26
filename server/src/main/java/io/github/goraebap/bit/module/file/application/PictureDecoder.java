package io.github.goraebap.bit.module.file.application;

/** Decodes a stored picture whole, so a file that only starts like a JPEG is refused as a member's or workspace's picture. */
public interface PictureDecoder {
    /** The decoded size in pixels. */
    record Decoded(int width, int height) {}

    /**
     * Reads the object at key, at most maxBytes of it, and decodes it; raises FILE_PICTURE_INVALID when it is not a
     * picture the decoder can read whole.
     */
    Decoded decode(String key, long maxBytes);
}
