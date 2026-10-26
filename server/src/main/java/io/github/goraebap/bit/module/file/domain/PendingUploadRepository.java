package io.github.goraebap.bit.module.file.domain;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface PendingUploadRepository {
    void save(PendingUpload upload);

    /** Reads the uploads inside the caller's write transaction, so two commands cannot bind the same one. */
    List<PendingUpload> findAllById(Collection<String> ids);

    List<PendingUpload> findAllCreatedBefore(Instant instant, int limit);

    void deleteAllById(Collection<String> ids);
}
