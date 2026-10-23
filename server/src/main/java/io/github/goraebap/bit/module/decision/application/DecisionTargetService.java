package io.github.goraebap.bit.module.decision.application;

import io.github.goraebap.bit.module.decision.domain.DecisionRepository;
import io.github.goraebap.bit.module.link.TargetNotFoundException;
import io.github.goraebap.bit.module.link.TargetRef;
import io.github.goraebap.bit.module.link.TargetSpi;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DecisionTargetService implements TargetSpi {
    private final DecisionRepository repository;
    private final ProjectFacade projectFacade;

    @Override
    public TargetType type() {
        return TargetType.decision;
    }

    @Override
    @Transactional(readOnly = true)
    public TargetRef requireAccess(CurrentUser actor, UUID workspaceId, UUID id, boolean writing) {
        var record = repository.findTarget(workspaceId, id).orElseThrow(TargetNotFoundException::new);
        var project = projectFacade.requireAccess(actor, workspaceId, record.projectId(), writing);
        return new TargetRef(
                type(),
                id,
                workspaceId,
                project.id(),
                project.key() + " D-" + String.format(java.util.Locale.ROOT, "%03d", record.number()),
                record.details().title(),
                record.version(),
                record.state().name().toLowerCase(java.util.Locale.ROOT));
    }
}
