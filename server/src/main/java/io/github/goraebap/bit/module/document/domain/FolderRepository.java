package io.github.goraebap.bit.module.document.domain;

import java.util.List;
import java.util.Optional;

/** Reads return live folders only. */
public interface FolderRepository {
    Optional<Folder> findById(String workspaceId, String id);

    /** Every live folder of one part (projectId null: the workspace's own), to walk their tree. */
    List<Folder> findAllByPart(String workspaceId, String projectId);

    /** Whether the folder holds a live folder or a live document. */
    boolean existsContentByFolderId(String folderId);

    void save(Folder folder);
}
