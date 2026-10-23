package io.github.goraebap.bit.module.link.application;

import io.github.goraebap.bit.module.link.TargetFacade;
import io.github.goraebap.bit.module.link.TargetNotFoundException;
import io.github.goraebap.bit.module.link.TargetRef;
import io.github.goraebap.bit.module.link.TargetSpi;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import jakarta.annotation.PostConstruct;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TargetService implements TargetFacade {
    private final List<TargetSpi> resolvers;
    private Map<TargetType, TargetSpi> targets = Map.of();
    private final WorkspaceFacade workspaceFacade;

    public TargetService(List<TargetSpi> targets, WorkspaceFacade workspaceFacade) {
        this.resolvers = List.copyOf(targets);
        this.workspaceFacade = workspaceFacade;
    }

    @PostConstruct
    void initializeRegistry() {
        var registry = new EnumMap<TargetType, TargetSpi>(TargetType.class);
        for (var target : resolvers)
            if (registry.putIfAbsent(target.type(), target) != null) {
                throw new IllegalStateException("Duplicate target resolver: " + target.type());
            }
        targets = Map.copyOf(registry);
    }

    @Override
    @Transactional(readOnly = true)
    public TargetRef requireAccess(CurrentUser actor, UUID workspaceId, TargetType type, UUID id, boolean writing) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var resolver = type == null ? null : targets.get(type);
        if (resolver == null || id == null) throw LinkErrorCode.LINK_TARGET_NOT_FOUND.raise();
        try {
            return resolver.requireAccess(actor, workspaceId, id, writing);
        } catch (TargetNotFoundException missing) {
            throw LinkErrorCode.LINK_TARGET_NOT_FOUND.raise();
        }
    }
}
