package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;

public interface LinkFacade {
    String connect(
            CurrentUser actor,
            String workspaceId,
            TargetType fromType,
            String fromId,
            String relation,
            TargetType toType,
            String toId);

    List<RelationRef> relations(CurrentUser actor, String workspaceId, TargetType type, String id);

    void syncDocumentReferences(CurrentUser actor, String workspaceId, String documentId, String body);

    void disconnect(CurrentUser actor, String workspaceId, String linkId);

    /**
     * Each work item's live subtask_of parent, for those that have one (D-104). Read without an actor for the work item
     * module's own rule checks and views, so the ids are never shown as they are.
     */
    java.util.Map<String, String> parents(String workspaceId, java.util.Set<String> childIds);

    /** The work items whose live subtask_of link points at this one, read as {@link #parents} is. */
    java.util.Set<String> children(String workspaceId, String parentId);

    /**
     * Puts a work item under another (null: under none) in one step, replacing the parent it has, with the same access,
     * cycle and type rule checks as connecting and disconnecting (D-104). The same parent leaves it as it is.
     */
    void setParent(CurrentUser actor, String workspaceId, String childId, String parentId);

    void connectSessionRecord(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String sessionId,
            List<String> decisionIds,
            List<String> workItemIds);
    /** Only the decision state-transition transaction coordinates this protected relation. */
    String connectSupersession(CurrentUser actor, String workspaceId, String replacementId, String oldDecisionId);
}
