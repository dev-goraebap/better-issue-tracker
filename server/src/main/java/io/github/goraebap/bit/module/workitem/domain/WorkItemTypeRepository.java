package io.github.goraebap.bit.module.workitem.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/** Reads return live types unless said otherwise; a deleted type is gone for every caller choosing one. */
public interface WorkItemTypeRepository {
    /** In display order. */
    List<WorkItemType> findAllByWorkspaceId(String workspaceId);

    /** Deleted ones included, since a deleted work item may still carry one. */
    List<WorkItemType> findAllById(String workspaceId, Set<String> ids);

    Optional<WorkItemType> findById(String workspaceId, String id);

    Optional<WorkItemType> findDefault(String workspaceId);

    /** Names compare without letter case, as the unique index does. */
    boolean existsByNameAndIdNot(String workspaceId, String name, String id);

    /** Live work items of each type that has any. */
    java.util.Map<String, Long> countWorkItemsByType(String workspaceId);

    /** Live work items of the type. */
    long countWorkItemsByTypeId(String workspaceId, String typeId);

    /**
     * Live work items of the type that a rule would leave out: without a subtask_of parent when one is required, or
     * under a parent that is an event or of a type not among the allowed ones.
     */
    long countWorkItemsBreaking(String workspaceId, String typeId, boolean parentRequired, Set<String> parentTypeIds);

    void save(WorkItemType type);

    void saveAll(List<WorkItemType> types);

    void reorder(String workspaceId, List<String> ids, String actor, String agent, Instant now);
}
