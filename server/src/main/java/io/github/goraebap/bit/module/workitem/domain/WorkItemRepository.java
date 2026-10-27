package io.github.goraebap.bit.module.workitem.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface WorkItemRepository {
    Optional<WorkItem> findById(String projectId, String id, boolean includeDeleted);

    Optional<WorkItem> findTarget(String workspaceId, String id);

    long countAllById(String projectId, Set<String> ids);

    Optional<WorkItem> findByNumber(String projectId, long number);

    List<WorkItem> findColumnItems(String projectId, String columnId, boolean includeDeleted);

    /** A recurrence's live occurrences after a day, in day order. */
    List<WorkItem> findOccurrencesAfter(String recurrenceId, LocalDate day);

    /** The day of a recurrence's latest occurrence, deleted ones included, since a cancelled day is not made again. */
    Optional<LocalDate> findLatestOccurrence(String recurrenceId);

    List<Row> findAll(Query query, Point point, int limit);

    List<ColumnCount> countByColumn(Query query);

    record ColumnCount(String columnId, long count) {}

    /** Saves the item and makes its label links match {@link WorkItem#labelIds()}. */
    void save(WorkItem workItem);

    /**
     * A list filter. {@code projectId} scopes to one project (archived projects included); without it archived
     * projects are left out. Empty sets mean no filter on that value; sets are matched as any-of. personId keeps the
     * items that person does or attends. from/to keep items whose days overlap them; a timed event is kept when its
     * times come within a day of them, since the days are the member's own and the server keeps UTC.
     */
    record Query(
            String workspaceId,
            String projectId,
            Set<String> projectIds,
            String personId,
            Set<WorkItem.Kind> kinds,
            String columnId,
            boolean backlog,
            Set<String> columnIds,
            Set<String> labelIds,
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
            kinds = Set.copyOf(kinds);
            columnIds = Set.copyOf(columnIds);
            labelIds = Set.copyOf(labelIds);
            categories = Set.copyOf(categories);
            priorities = Set.copyOf(priorities);
            triggers = Set.copyOf(triggers);
        }
    }

    record Point(Instant time, Double position, String id) {}

    /** {@code labelIds} may include deleted labels; the label module decides what is shown. */
    record Row(
            String id,
            String projectId,
            String projectKey,
            long number,
            WorkItem.Kind kind,
            WorkItem.Details details,
            Set<String> labelIds,
            String columnId,
            String columnCategory,
            double position,
            Instant closedAt,
            Instant archivedAt,
            String recurrenceId,
            LocalDate occurrenceOn,
            long version,
            Audit audit,
            List<Person> people) {
        public Row {
            labelIds = Set.copyOf(labelIds);
            people = List.copyOf(people);
        }
    }

    /** One of the people of an item, by name. */
    record Person(String id, String name) {}
}
