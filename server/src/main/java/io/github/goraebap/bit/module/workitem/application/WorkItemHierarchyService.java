package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.domain.WorkItem;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkItemHierarchyService {
    private final WorkItemService items;
    private final ProjectFacade projects;

    /**
     * A subtask in the parent's project, first to-do column, with its priority; of the type given (null: the
     * workspace's default), which must allow the parent's (D-104).
     */
    @Transactional
    public String createChild(
            CurrentUser actor,
            String workspace,
            String project,
            String parent,
            String title,
            String description,
            String typeId) {
        var source = items.get(actor, workspace, project, parent);
        items.requireAccess(actor, workspace, project, parent, true, false);
        String column = projects.boardColumns(actor, workspace, project).stream()
                .filter(c -> c.category() == ColumnCategory.todo)
                .map(ProjectFacade.ColumnInfo::id)
                .findFirst()
                .orElse(null);
        return items.create(
                actor,
                workspace,
                project,
                WorkItem.Kind.task,
                typeId,
                parent,
                new WorkItem.Details(
                        title,
                        description,
                        source.priority() == null ? null : WorkItem.Priority.valueOf(source.priority()),
                        null,
                        (String) null,
                        null,
                        null),
                column,
                Set.of(),
                null);
    }
}
