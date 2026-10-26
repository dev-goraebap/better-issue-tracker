package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.Folder;
import io.github.goraebap.bit.module.document.domain.FolderRepository;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Folders of 문서함 (D-093): made, renamed and moved within their part, and deleted once empty. */
@Service
@RequiredArgsConstructor
public class FolderService {
    private final FolderRepository folderRepository;
    private final DocumentQuery documentQuery;
    private final Parts parts;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<DocumentViews.Folder> list(CurrentUser actor, String workspaceId, String projectId) {
        parts.require(actor, workspaceId, projectId, false);
        return documentQuery.folders(workspaceId, projectId);
    }

    @Transactional
    public String create(CurrentUser actor, String workspaceId, String projectId, String parentId, String name) {
        parts.require(actor, workspaceId, projectId, true);
        if (parentId != null) parts.requireFolder(workspaceId, projectId, parentId);
        var siblings = folderRepository.findAllByPart(workspaceId, projectId);
        requireFreeName(siblings, parentId, name, null);
        var folder =
                Folder.create(workspaceId, projectId, parentId, name, actor.userId(), actor.agent(), clock.instant());
        folderRepository.save(folder);
        return folder.id();
    }

    @Transactional
    public void rename(CurrentUser actor, String workspaceId, String id, long expectedVersion, String name) {
        var folder = access(actor, workspaceId, id, expectedVersion);
        requireFreeName(folderRepository.findAllByPart(workspaceId, folder.projectId()), folder.parentId(), name, id);
        folder.rename(name, actor.userId(), actor.agent(), clock.instant());
        folderRepository.save(folder);
    }

    /** Moves a folder under another of its part (null: to the top), never into itself or a folder it holds. */
    @Transactional
    public void move(CurrentUser actor, String workspaceId, String id, long expectedVersion, String parentId) {
        var folder = access(actor, workspaceId, id, expectedVersion);
        if (Objects.equals(folder.parentId(), parentId)) return;
        var part = folderRepository.findAllByPart(workspaceId, folder.projectId());
        if (parentId != null) {
            parts.requireFolder(workspaceId, folder.projectId(), parentId);
            Map<String, Folder> byId = part.stream().collect(Collectors.toMap(Folder::id, Function.identity()));
            for (String at = parentId; at != null; at = byId.get(at).parentId())
                if (at.equals(id) || !byId.containsKey(at)) throw DocumentErrorCode.FOLDER_MOVE_INVALID.raise();
        }
        requireFreeName(part, parentId, folder.name(), id);
        folder.move(parentId, actor.userId(), actor.agent(), clock.instant());
        folderRepository.save(folder);
    }

    /** Deletes an empty folder; one that still holds a folder or a document is FOLDER_NOT_EMPTY. */
    @Transactional
    public void delete(CurrentUser actor, String workspaceId, String id, long expectedVersion) {
        var folder = access(actor, workspaceId, id, expectedVersion);
        if (folderRepository.existsContentByFolderId(id)) throw DocumentErrorCode.FOLDER_NOT_EMPTY.raise();
        folder.delete(actor.userId(), actor.agent(), clock.instant());
        folderRepository.save(folder);
    }

    /**
     * The folder a slash-separated path names in a part ("설계/화면"), made with its missing folders when create; an
     * empty path is the part's top (null). For agents, who name folders by path (D-093).
     */
    @Transactional
    public String resolve(CurrentUser actor, String workspaceId, String projectId, String path, boolean create) {
        parts.require(actor, workspaceId, projectId, create);
        if (path == null || path.isBlank()) return null;
        var part = new java.util.ArrayList<>(folderRepository.findAllByPart(workspaceId, projectId));
        String parentId = null;
        for (String raw : path.split("/")) {
            if (raw.isBlank()) continue;
            String name = Folder.validName(raw);
            String under = parentId;
            var found = part.stream()
                    .filter(folder -> Objects.equals(folder.parentId(), under) && folder.named(name))
                    .findFirst();
            if (found.isPresent()) {
                parentId = found.get().id();
                continue;
            }
            if (!create) throw DocumentErrorCode.FOLDER_NOT_FOUND.raise();
            var folder =
                    Folder.create(workspaceId, projectId, under, name, actor.userId(), actor.agent(), clock.instant());
            folderRepository.save(folder);
            part.add(folder);
            parentId = folder.id();
        }
        return parentId;
    }

    private Folder access(CurrentUser actor, String workspaceId, String id, long expectedVersion) {
        var folder = folderRepository.findById(workspaceId, id).orElseThrow(DocumentErrorCode.FOLDER_NOT_FOUND::raise);
        parts.require(actor, workspaceId, folder.projectId(), true);
        if (folder.version() != expectedVersion) throw DocumentErrorCode.FOLDER_VERSION_CONFLICT.raise();
        return folder;
    }

    private static void requireFreeName(List<Folder> part, String parentId, String name, String exceptId) {
        String wanted = Folder.validName(name);
        if (part.stream()
                .anyMatch(folder -> Objects.equals(folder.parentId(), parentId)
                        && !folder.id().equals(exceptId)
                        && folder.named(wanted))) throw DocumentErrorCode.FOLDER_NAME_CONFLICT.raise();
    }
}
