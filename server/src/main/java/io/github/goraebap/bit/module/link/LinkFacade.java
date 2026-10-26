package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;

public interface LinkFacade {
    String connect(
            CurrentUser actor,
            String workspaceId,
            TargetType fromType,
            String fromId,
            String relation,
            TargetType toType,
            String toId);

    void disconnect(CurrentUser actor, String workspaceId, String linkId);

    void connectSessionRecord(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String sessionId,
            List<String> decisionIds,
            List<String> issueIds);
    /** Only the decision state-transition transaction coordinates this protected relation. */
    String connectSupersession(CurrentUser actor, String workspaceId, String replacementId, String oldDecisionId);
}
