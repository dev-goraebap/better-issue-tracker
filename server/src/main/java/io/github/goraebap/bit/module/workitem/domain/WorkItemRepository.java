package io.github.goraebap.bit.module.workitem.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface WorkItemRepository {
    Optional<WorkItem> findById(UUID projectId, UUID id, boolean includeDeleted);

    Optional<WorkItem> findTarget(UUID workspaceId, UUID id);

    long countAllById(UUID projectId, Set<UUID> ids);

    Optional<WorkItem> findByNumber(UUID projectId, long number);

    List<WorkItem> findColumnItems(UUID projectId, UUID columnId, boolean includeDeleted);

    List<Row> findAll(Query query, Point point, int limit);

    List<ColumnCount> countByColumn(Query query);

    record ColumnCount(UUID columnId, long count) {}

    /** Saves the item and makes its label links match {@link WorkItem#labelIds()}. */
    void save(WorkItem workItem);

    /**
     * A list filter. {@code projectId} scopes to one project (archived projects included); without it archived
     * projects are left out. Empty sets mean no filter on that value; sets are matched as any-of.
     */
    record Query(
            UUID workspaceId,
            UUID projectId,
            Set<UUID> projectIds,
            UUID assigneeId,
            UUID columnId,
            boolean backlog,
            Set<UUID> columnIds,
            Set<UUID> labelIds,
            Set<String> categories,
            boolean noCategory,
            Set<WorkItem.Priority> priorities,
            Set<WorkItem.TriggerType> triggers,
            String search,
            boolean archived,
            boolean deleted,
            Boolean closed,
            Boolean hasDates,
            LocalDate from,
            LocalDate to,
            String sort,
            String direction) {
        public Query {
            projectIds = Set.copyOf(projectIds);
            columnIds = Set.copyOf(columnIds);
            labelIds = Set.copyOf(labelIds);
            categories = Set.copyOf(categories);
            priorities = Set.copyOf(priorities);
            triggers = Set.copyOf(triggers);
        }
    }

    record Point(Instant time, Double position, UUID id) {}

    /** {@code labelIds} may include deleted labels; the label module decides what is shown. */
    record Row(
            UUID id,
            UUID projectId,
            String projectKey,
            long number,
            WorkItem.Details details,
            Set<UUID> labelIds,
            UUID columnId,
            String columnCategory,
            double position,
            Instant closedAt,
            Instant archivedAt,
            long version,
            Audit audit,
            String assigneeName) {
        public Row {
            labelIds = Set.copyOf(labelIds);
        }
    }
}
