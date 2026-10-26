package io.github.goraebap.bit.module.decision;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;

public interface DecisionFacade {
    String create(CurrentUser actor, String workspaceId, String projectId, Draft draft);

    List<String> createAll(CurrentUser actor, String workspaceId, String projectId, List<Draft> drafts);

    Ref findByRef(CurrentUser actor, String workspaceId, String projectId, String reference);

    record Draft(String title, String body, String rejectedAlternatives, String triggerType) {}

    record Ref(String id, String projectId, String reference) {}
}
