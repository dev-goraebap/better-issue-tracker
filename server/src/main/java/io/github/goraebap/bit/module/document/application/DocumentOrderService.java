package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.DocumentOrderRepository;
import io.github.goraebap.bit.module.document.domain.DocumentOrderRepository.Saved;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashSet;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DocumentOrderService {
    private final DocumentOrderRepository documentOrderRepository;
    private final DocumentQuery documentQuery;
    private final Parts parts;
    private final ProjectFacade projectFacade;
    private final Clock clock;

    @Transactional(readOnly = true)
    public DocumentViews.Order get(CurrentUser actor, String workspaceId, String projectId, String folderId) {
        require(actor, workspaceId, projectId, folderId, false);
        var saved = documentOrderRepository.find(workspaceId, scope(projectId, folderId));
        var children = children(workspaceId, projectId, folderId);
        var visible = saved.order().stream()
                .filter(key -> children.contains(key)
                        || (projectId == null && folderId == null && visibleProject(actor, workspaceId, key)))
                .toList();
        return new DocumentViews.Order(saved.version(), visible);
    }

    @Transactional
    public void reorder(CurrentUser actor, String workspaceId, DocumentRequests.Order request) {
        String projectId = request.projectId();
        String folderId = request.folderId();
        require(actor, workspaceId, projectId, folderId, true);
        var saved = documentOrderRepository.find(workspaceId, scope(projectId, folderId));
        if (saved.version() != request.expectedVersion()) throw DocumentErrorCode.DOCUMENT_ORDER_CONFLICT.raise();
        var children = children(workspaceId, projectId, folderId);
        var unique = new HashSet<>(request.order());
        if (unique.size() != request.order().size() || !unique.containsAll(children))
            throw DocumentErrorCode.DOCUMENT_ORDER_INVALID.raise();
        for (String key : unique) {
            if (children.contains(key)) continue;
            if (projectId != null || folderId != null || !visibleProject(actor, workspaceId, key))
                throw DocumentErrorCode.DOCUMENT_ORDER_INVALID.raise();
        }
        // Other members' private project rows keep their slots; the caller's visible slots receive the new order.
        var remaining = request.order().iterator();
        var merged = new ArrayList<String>();
        for (String key : saved.order()) {
            if (key.startsWith("project:") && !visibleProject(actor, workspaceId, key)) merged.add(key);
            else if (remaining.hasNext()) merged.add(remaining.next());
        }
        remaining.forEachRemaining(merged::add);
        documentOrderRepository.save(
                workspaceId,
                scope(projectId, folderId),
                new Saved(saved.version() + 1, merged),
                actor.userId(),
                actor.agent(),
                clock.instant());
    }

    private void require(CurrentUser actor, String workspaceId, String projectId, String folderId, boolean writing) {
        parts.require(actor, workspaceId, projectId, writing);
        if (folderId != null) parts.requireFolder(workspaceId, projectId, folderId);
    }

    private HashSet<String> children(String workspaceId, String projectId, String folderId) {
        var result = new HashSet<String>();
        documentQuery.folders(workspaceId, projectId).stream()
                .filter(f -> java.util.Objects.equals(f.parentId(), folderId))
                .forEach(f -> result.add("folder:" + f.id()));
        documentQuery.documentsIn(workspaceId, projectId, folderId).forEach(d -> result.add("document:" + d.id()));
        return result;
    }

    private boolean visibleProject(CurrentUser actor, String workspaceId, String key) {
        if (!key.matches("project:[A-Za-z][A-Za-z0-9]{9}")) return false;
        try {
            return !projectFacade
                    .requireAccess(actor, workspaceId, key.substring(8), false)
                    .archived();
        } catch (BusinessException denied) {
            return false;
        }
    }

    private static String scope(String projectId, String folderId) {
        return (projectId == null ? "" : projectId) + "/" + (folderId == null ? "" : folderId);
    }
}
