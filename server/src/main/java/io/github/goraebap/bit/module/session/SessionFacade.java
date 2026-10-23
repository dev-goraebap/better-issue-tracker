package io.github.goraebap.bit.module.session;

import io.github.goraebap.bit.module.decision.DecisionFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SessionFacade {
    UUID record(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            Draft draft,
            List<Person> participants,
            List<DecisionFacade.Draft> decisions,
            List<UUID> workItemIds);

    Ref findByRef(CurrentUser actor, UUID workspaceId, UUID projectId, String reference);

    record Draft(String type, String title, String summary, Instant occurredAt) {}

    record Person(String kind, UUID userId, String displayName) {}

    record Ref(UUID id, UUID projectId, String reference) {}
}
