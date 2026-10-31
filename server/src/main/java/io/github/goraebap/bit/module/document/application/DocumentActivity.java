package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.document.domain.Document;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/** A document's change, told to its activity (D-078) within the change's transaction. */
@Component
@RequiredArgsConstructor
class DocumentActivity {
    private final ApplicationEventPublisher applicationEventPublisher;

    void changed(CurrentUser actor, Document document, String action, List<FieldChange> changes) {
        applicationEventPublisher.publishEvent(new TargetChangedEvent(
                document.workspaceId(),
                document.projectId(),
                TargetType.document,
                document.id(),
                action,
                document.version(),
                actor.userId(),
                actor.agent(),
                document.audit().updatedAt(),
                changes));
    }
}
