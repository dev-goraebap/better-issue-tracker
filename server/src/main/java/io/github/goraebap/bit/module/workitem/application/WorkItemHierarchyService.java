package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.link.LinkFacade;
import io.github.goraebap.bit.module.link.TargetType;
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
    private final LinkFacade links;

    @Transactional
    public String createChild(
            CurrentUser actor, String workspace, String project, String parent, String title, String description) {
        var source = items.get(actor, workspace, project, parent);
        items.requireAccess(actor, workspace, project, parent, true, false);
        String column = projects.boardColumns(actor, workspace, project).stream()
                .filter(c -> c.category() == ColumnCategory.todo)
                .map(ProjectFacade.ColumnInfo::id)
                .findFirst()
                .orElse(null);
        String child = items.create(
                actor,
                workspace,
                project,
                new WorkItem.Details(
                        title,
                        description,
                        source.priority() == null ? null : WorkItem.Priority.valueOf(source.priority()),
                        null,
                        (String) null,
                        null,
                        null),
                column,
                Set.of());
        links.connect(actor, workspace, TargetType.work_item, child, "subtask_of", TargetType.work_item, parent);
        return child;
    }
}
