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

    void save(WorkItem workItem);

    record Query(
            UUID workspaceId,
            UUID projectId,
            UUID assigneeId,
            UUID columnId,
            boolean backlog,
            Set<WorkItem.Priority> priorities,
            Set<WorkItem.TriggerType> triggers,
            String search,
            boolean archived,
            boolean deleted,
            Boolean closed,
            LocalDate from,
            LocalDate to,
            String sort,
            String direction) {
        public Query {
            priorities = Set.copyOf(priorities);
            triggers = Set.copyOf(triggers);
        }
    }

    record Point(Instant time, Double position, UUID id) {}

    record Row(
            UUID id,
            UUID projectId,
            String projectKey,
            long number,
            WorkItem.Details details,
            UUID columnId,
            double position,
            Instant closedAt,
            Instant archivedAt,
            long version,
            Audit audit,
            String assigneeName) {}
}
