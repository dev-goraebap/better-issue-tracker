package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.Folder;
import io.github.goraebap.bit.module.document.domain.FolderRepository;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Who may read or write a part of 문서함 (D-093): a project's part as its project allows (D-075), the workspace's own
 * part as the workspace allows its work, and whether a folder belongs to the part it is used in.
 */
@Component
@RequiredArgsConstructor
class Parts {
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;
    private final FolderRepository folderRepository;

    void require(CurrentUser actor, String workspaceId, String projectId, boolean writing) {
        if (projectId != null) projectFacade.requireAccess(actor, workspaceId, projectId, false);
        workspaceFacade.requireAccess(
                actor, workspaceId, writing ? WorkspaceFacade.Action.WRITE_DOCUMENTS : WorkspaceFacade.Action.READ);
    }

    /** The live folder of that part; a folder of another part, or none, is FOLDER_NOT_FOUND. */
    Folder requireFolder(String workspaceId, String projectId, String folderId) {
        return folderRepository
                .findById(workspaceId, folderId)
                .filter(folder -> Objects.equals(folder.projectId(), projectId))
                .orElseThrow(DocumentErrorCode.FOLDER_NOT_FOUND::raise);
    }

    /** The folders from the part's top down to the given one, that one last; empty for the top itself. */
    static List<DocumentViews.Folder> path(List<DocumentViews.Folder> part, String folderId) {
        Map<String, DocumentViews.Folder> byId =
                part.stream().collect(Collectors.toMap(DocumentViews.Folder::id, Function.identity()));
        var path = new ArrayList<DocumentViews.Folder>();
        for (String at = folderId; at != null && byId.containsKey(at) && path.size() <= byId.size(); ) {
            var folder = byId.get(at);
            path.addFirst(folder);
            at = folder.parentId();
        }
        return path;
    }
}
