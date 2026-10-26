package io.github.goraebap.bit.module.file.application;

import io.github.goraebap.bit.module.file.domain.ImageTraits;
import io.github.goraebap.bit.module.file.domain.PendingUpload;
import io.github.goraebap.bit.module.file.domain.UploadPurpose;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class FileRequests {
    private FileRequests() {}

    /**
     * A file about to be sent: its name, whose extension decides the format, its exact size in bytes, and what it is for
     * (an attachment when left out). A picture may bring what the browser measured: its main colour and its size.
     */
    public record Upload(
            @NotBlank @Size(max = PendingUpload.FILENAME_MAX) String filename,

            @NotNull @Positive Long size,

            @Schema(description = "attachment(업무 설명·댓글 파일, 기본) 또는 picture(아바타·로고, 정사각 JPEG 1MB 이하)")
            UploadPurpose purpose,

            @Pattern(regexp = ImageTraits.COLOR_PATTERN) @Schema(description = "사진 자리를 칠할 대표색(#RRGGBB)")
            String dominantColor,

            @Positive @Max(ImageTraits.MAX_SIDE) @Schema(description = "사진의 가로(px)")
            Integer width,

            @Positive @Max(ImageTraits.MAX_SIDE) @Schema(description = "사진의 세로(px)")
            Integer height) {
        public Upload {
            purpose = purpose == null ? UploadPurpose.attachment : purpose;
        }
    }
}
