package io.github.goraebap.bit.module.issue.domain;

import io.github.goraebap.bit.shared.domain.Audit;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface IssueRepository {
    Optional<Issue> findById(String projectId, String id, boolean includeDeleted);

    Optional<Issue> findTarget(String workspaceId, String id);

    long countAllById(String projectId, Set<String> ids);

    Optional<Issue> findByNumber(String projectId, long number);

    List<Issue> findColumnItems(String projectId, String columnId, boolean includeDeleted);

    List<Row> findAll(Query query, Point point, int limit);

    List<ColumnCount> countByColumn(Query query);

    record ColumnCount(String columnId, long count) {}

    /** Saves the item and makes its label links match {@link Issue#labelIds()}. */
    void save(Issue issue);

    /**
     * A list filter. {@code projectId} scopes to one project (archived projects included); without it archived
     * projects are left out. Empty sets mean no filter on that value; sets are matched as any-of.
     */
    record Query(
            String workspaceId,
            String projectId,
            Set<String> projectIds,
            String assigneeId,
            String columnId,
            boolean backlog,
            Set<String> columnIds,
            Set<String> labelIds,
            Set<String> categories,
            boolean noCategory,
            Set<Issue.Priority> priorities,
            Set<Issue.TriggerType> triggers,
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

    record Point(Instant time, Double position, String id) {}

    /** {@code labelIds} may include deleted labels; the label module decides what is shown. */
    record Row(
            String id,
            String projectId,
            String projectKey,
            long number,
            Issue.Details details,
            Set<String> labelIds,
            String columnId,
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
