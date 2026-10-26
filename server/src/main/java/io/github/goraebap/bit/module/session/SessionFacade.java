package io.github.goraebap.bit.module.session;

import io.github.goraebap.bit.module.decision.DecisionFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Instant;
import java.util.List;

public interface SessionFacade {
    String record(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            Draft draft,
            List<Person> participants,
            List<DecisionFacade.Draft> decisions,
            List<String> issueIds);

    Ref findByRef(CurrentUser actor, String workspaceId, String projectId, String reference);

    record Draft(String type, String title, String summary, Instant occurredAt) {}

    record Person(String kind, String userId, String displayName) {}

    record Ref(String id, String projectId, String reference) {}
}
