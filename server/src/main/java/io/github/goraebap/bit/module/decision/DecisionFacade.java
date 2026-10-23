package io.github.goraebap.bit.module.decision;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
import java.util.UUID;

public interface DecisionFacade {
    UUID create(CurrentUser actor, UUID workspaceId, UUID projectId, Draft draft);

    List<UUID> createAll(CurrentUser actor, UUID workspaceId, UUID projectId, List<Draft> drafts);

    Ref findByRef(CurrentUser actor, UUID workspaceId, UUID projectId, String reference);

    record Draft(String title, String body, String rejectedAlternatives, String triggerType) {}

    record Ref(UUID id, UUID projectId, String reference) {}
}
