package io.github.goraebap.bit.module.file.infrastructure;

import io.github.goraebap.bit.module.file.application.FileErrorCode;
import io.github.goraebap.bit.module.file.application.PictureDecoder;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.storage.ObjectStorage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Decodes pictures with the JDK's JPEG reader; the header's size is checked before the pixels are read. */
@Component
@RequiredArgsConstructor
class ImageIoPictureDecoder implements PictureDecoder {
    /** Pixels a picture may have, so a small file claiming a huge size is refused before it is decoded. */
    static final long MAX_PIXELS = 16L * 1024 * 1024;

    private final ObjectStorage objectStorage;

    @Override
    public Decoded decode(String key, long maxBytes) {
        byte[] bytes;
        try (InputStream in = objectStorage.open(key)) {
            bytes = in.readNBytes((int) Math.min(Integer.MAX_VALUE - 8, maxBytes + 1));
        } catch (IOException e) {
            throw FileErrorCode.FILE_PICTURE_INVALID.raise();
        }
        if (bytes.length > maxBytes) throw FileErrorCode.FILE_PICTURE_INVALID.raise();
        var readers = ImageIO.getImageReadersByFormatName("jpeg");
        if (!readers.hasNext()) throw FileErrorCode.FILE_PICTURE_INVALID.raise();
        ImageReader reader = readers.next();
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            reader.setInput(input, true, true);
            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            if (width <= 0 || height <= 0 || (long) width * height > MAX_PIXELS)
                throw FileErrorCode.FILE_PICTURE_INVALID.raise();
            reader.read(0);
            return new Decoded(width, height);
        } catch (BusinessException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            // A broken or disguised file fails inside the decoder in many ways; all of them mean the same to the
            // member.
            throw FileErrorCode.FILE_PICTURE_INVALID.raise();
        } finally {
            reader.dispose();
        }
    }
}
