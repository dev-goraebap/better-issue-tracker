package io.github.goraebap.bit.module.workitem;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Set;

public interface WorkItemFacade {
    void requireAccess(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String workItemId,
            boolean writing,
            boolean includeDeleted);

    Ref findByRef(CurrentUser actor, String workspaceId, String reference);

    /** A live work item as another module needs it: what a repository mirrors of it (D-087). */
    Snapshot get(CurrentUser actor, String workspaceId, String projectId, String workItemId);

    /** A new work item in a column (null is the backlog), with the same rules as one made on the screen. */
    String create(CurrentUser actor, String workspaceId, String projectId, NewWorkItem workItem);

    /** Changes only what is given (null leaves a part as it is), against the work item's current version. */
    void revise(CurrentUser actor, String workspaceId, String projectId, String workItemId, Revision revision);

    /** Moves the work item to the end of a column (null is the backlog); the column it is in already leaves it. */
    void moveTo(CurrentUser actor, String workspaceId, String projectId, String workItemId, String columnId);

    record Ref(String id, String projectId, String reference) {}

    /** priority is low, medium, high or urgent, or null; columnId null is the backlog. */
    record Snapshot(
            String id,
            String projectId,
            long number,
            String reference,
            String title,
            String description,
            String priority,
            String columnId,
            Set<String> labelIds,
            long version) {
        public Snapshot {
            labelIds = Set.copyOf(labelIds);
        }
    }

    record NewWorkItem(String title, String description, String priority, String columnId, Set<String> labelIds) {
        public NewWorkItem {
            labelIds = Set.copyOf(labelIds);
        }
    }

    /** A blank priority clears it. */
    record Revision(String title, String description, String priority, Set<String> labelIds) {
        public Revision {
            labelIds = labelIds == null ? null : Set.copyOf(labelIds);
        }
    }
}
