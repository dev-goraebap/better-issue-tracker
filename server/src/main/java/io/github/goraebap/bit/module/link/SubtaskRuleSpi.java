package io.github.goraebap.bit.module.link;

/**
 * The rules a work item's subtask_of parent follows (D-104): which type may sit under which. The link module keeps the
 * links and asks before it adds, moves or removes one; the work item module keeps the types and answers. A refusal is
 * a business error saying how to fix it. Implementations must not depend on a service that itself injects LinkFacade.
 */
public interface SubtaskRuleSpi {
    /** Refuses a parent the child's type does not allow, or one that is an event. */
    void requireParentAllowed(String workspaceId, String childId, String parentId);

    /** Refuses leaving the child without a parent when its type needs one. */
    void requireParentOptional(String workspaceId, String childId);
}
