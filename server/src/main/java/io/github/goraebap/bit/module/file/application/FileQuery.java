package io.github.goraebap.bit.module.file.application;

import io.github.goraebap.bit.module.file.FileOwner;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FileQuery {
    /** The kept files of the owners, each owner's in position order. */
    List<FileViews.StoredFile> findByOwners(FileOwner owner, Collection<String> ownerIds);

    Optional<FileViews.StoredFile> findOne(FileOwner owner, String ownerId, String attachmentId);
}
