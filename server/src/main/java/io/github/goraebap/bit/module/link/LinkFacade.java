package io.github.goraebap.bit.module.link;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.UUID;

public interface LinkFacade {
    UUID connect(
            CurrentUser actor,
            UUID workspaceId,
            TargetType fromType,
            UUID fromId,
            String relation,
            TargetType toType,
            UUID toId);

    void disconnect(CurrentUser actor, UUID workspaceId, UUID linkId);
    /** Only the decision state-transition transaction coordinates this protected relation. */
    UUID connectSupersession(CurrentUser actor, UUID workspaceId, UUID replacementId, UUID oldDecisionId);
}
