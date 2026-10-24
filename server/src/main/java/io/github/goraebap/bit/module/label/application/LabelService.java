package io.github.goraebap.bit.module.label.application;

import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.label.domain.Label;
import io.github.goraebap.bit.module.label.domain.LabelRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceCreatedEvent;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
@RequiredArgsConstructor
public class LabelService implements LabelFacade {
    private final LabelRepository labelRepository;
    private final WorkspaceFacade workspaceFacade;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, LabelRef> findAllById(CurrentUser actor, UUID workspaceId, Set<UUID> labelIds) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        return labelRepository.findAllById(workspaceId, labelIds).stream()
                .collect(Collectors.toUnmodifiableMap(Label::id, LabelService::ref));
    }

    @Override
    @Transactional(readOnly = true)
    public void requireAccess(CurrentUser actor, UUID workspaceId, UUID labelId, boolean writing) {
        workspaceFacade.requireAccess(
                actor, workspaceId, writing ? WorkspaceFacade.Action.WRITE_WORK : WorkspaceFacade.Action.READ);
        if (labelId != null) label(workspaceId, labelId);
    }

    @Transactional(readOnly = true)
    public List<LabelViews.Item> list(CurrentUser actor, UUID workspaceId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        return labelRepository.findAllByWorkspaceId(workspaceId).stream()
                .map(LabelService::view)
                .toList();
    }

    @Transactional(readOnly = true)
    public LabelViews.Item get(CurrentUser actor, UUID workspaceId, UUID labelId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        return view(label(workspaceId, labelId));
    }

    @Transactional
    public UUID create(CurrentUser actor, UUID workspaceId, String name, String color) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        var label = Label.create(workspaceId, name, color, actor.userId(), agent(actor), clock.instant());
        if (labelRepository.existsByNameAndIdNot(workspaceId, label.name(), null))
            throw LabelErrorCode.LABEL_NAME_CONFLICT.raise();
        labelRepository.save(label);
        return label.id();
    }

    @Transactional
    public void revise(CurrentUser actor, UUID workspaceId, UUID labelId, LabelRequests.Update request) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        var label = label(workspaceId, labelId);
        version(label, request.getExpectedVersion());
        if (request.hasName() && request.getName() == null || request.hasColor() && request.getColor() == null)
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        String name = request.hasName() ? request.getName() : label.name();
        String color = request.hasColor() ? request.getColor() : label.color();
        if (label.system() && label.renames(name)) throw LabelErrorCode.LABEL_SYSTEM_LOCKED.raise();
        if (label.renames(name) && labelRepository.existsByNameAndIdNot(workspaceId, name, labelId))
            throw LabelErrorCode.LABEL_NAME_CONFLICT.raise();
        long before = label.version();
        label.revise(name, color, actor.userId(), agent(actor), clock.instant());
        if (label.version() != before) labelRepository.save(label);
    }

    @Transactional
    public void delete(CurrentUser actor, UUID workspaceId, UUID labelId, long expectedVersion) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        var label = label(workspaceId, labelId);
        version(label, expectedVersion);
        if (label.system()) throw LabelErrorCode.LABEL_SYSTEM_LOCKED.raise();
        label.delete(actor.userId(), agent(actor), clock.instant());
        labelRepository.save(label);
    }

    /** Seeds the decision label in the workspace's own transaction, so a workspace never exists without it. */
    @Transactional(propagation = Propagation.MANDATORY)
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void seed(WorkspaceCreatedEvent event) {
        labelRepository.save(
                Label.decision(event.workspaceId(), event.actorId(), event.actorAgent(), event.occurredAt()));
    }

    private Label label(UUID workspaceId, UUID labelId) {
        return labelRepository.findById(workspaceId, labelId).orElseThrow(LabelErrorCode.LABEL_NOT_FOUND::raise);
    }

    private static void version(Label label, Long expected) {
        if (expected == null || label.version() != expected) throw LabelErrorCode.LABEL_VERSION_CONFLICT.raise();
    }

    private static LabelRef ref(Label label) {
        return new LabelRef(label.id(), label.name(), label.color(), label.system());
    }

    private static LabelViews.Item view(Label label) {
        var a = label.audit();
        return new LabelViews.Item(
                label.id(),
                label.workspaceId(),
                label.name(),
                label.color(),
                label.system(),
                label.systemKey(),
                label.version(),
                a.createdAt(),
                a.updatedAt());
    }

    private static String agent(CurrentUser actor) {
        return actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null;
    }
}
