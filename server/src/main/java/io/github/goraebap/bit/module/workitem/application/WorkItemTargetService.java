package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.link.TargetNotFoundException;
import io.github.goraebap.bit.module.link.TargetRef;
import io.github.goraebap.bit.module.link.TargetSpi;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.domain.WorkItemRepository;
import io.github.goraebap.bit.shared.web.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkItemTargetService implements TargetSpi {
    private final WorkItemRepository repository;
    private final ProjectFacade projectFacade;

    @Override
    @Transactional(readOnly = true)
    public void requireAllInProject(
            CurrentUser actor, String workspaceId, String projectId, java.util.Set<String> ids, boolean writing) {
        projectFacade.requireAccess(actor, workspaceId, projectId, writing);
        if (repository.countAllById(projectId, ids) != ids.size()) throw new TargetNotFoundException();
    }

    @Override
    public TargetType type() {
        return TargetType.work_item;
    }

    @Override
    @Transactional(readOnly = true)
    public TargetRef requireAccess(CurrentUser actor, String workspaceId, String id, boolean writing) {
        var item = repository.findTarget(workspaceId, id).orElseThrow(TargetNotFoundException::new);
        var project = projectFacade.requireAccess(actor, workspaceId, item.projectId(), writing);
        return new TargetRef(
                type(),
                id,
                workspaceId,
                project.id(),
                project.key() + "-" + item.number(),
                item.details().title(),
                item.version(),
                null);
    }
}
