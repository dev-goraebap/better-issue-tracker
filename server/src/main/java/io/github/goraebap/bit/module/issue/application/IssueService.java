package io.github.goraebap.bit.module.issue.application;

import io.github.goraebap.bit.module.issue.IssueFacade;
import io.github.goraebap.bit.module.issue.domain.Issue;
import io.github.goraebap.bit.module.issue.domain.IssueRepository;
import io.github.goraebap.bit.module.label.LabelFacade;
import io.github.goraebap.bit.module.link.TargetChangedEvent;
import io.github.goraebap.bit.module.link.TargetChangedEvent.FieldChange;
import io.github.goraebap.bit.module.link.TargetType;
import io.github.goraebap.bit.module.project.ColumnIssueSpi;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IssueService implements IssueFacade, ColumnIssueSpi {
    private static final Pattern REFERENCE = Pattern.compile("([A-Z0-9]{2,10})-([1-9][0-9]{0,18})");
    private final IssueRepository issueRepository;
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;
    private final LabelFacade labelFacade;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public void requireAccess(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String issueId,
            boolean writing,
            boolean includeDeleted) {
        access(actor, workspaceId, projectId, issueId, writing, includeDeleted);
    }

    @Override
    @Transactional(readOnly = true)
    public Ref findByRef(CurrentUser actor, String workspaceId, String reference) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var match = REFERENCE.matcher(reference == null ? "" : reference.strip().toUpperCase(Locale.ROOT));
        if (!match.matches()) throw IssueErrorCode.ISSUE_NOT_FOUND.raise();
        long number;
        try {
            number = Long.parseLong(match.group(2));
        } catch (NumberFormatException invalid) {
            throw IssueErrorCode.ISSUE_NOT_FOUND.raise();
        }
        var project = projectFacade.findByKey(actor, workspaceId, match.group(1));
        var w = issueRepository.findByNumber(project.id(), number).orElseThrow(IssueErrorCode.ISSUE_NOT_FOUND::raise);
        return new Ref(w.id(), w.projectId(), project.key() + "-" + w.number());
    }

    @Transactional
    public String create(
            CurrentUser actor, String workspaceId, String projectId, Issue.Details details, String columnId) {
        return create(actor, workspaceId, projectId, details, columnId, Set.of());
    }

    @Transactional
    public String create(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            Issue.Details details,
            String columnId,
            Set<String> labelIds) {
        projectFacade.requireAccess(actor, workspaceId, projectId, true);
        validateDates(details);
        assignee(actor, workspaceId, details.assigneeId());
        labels(actor, workspaceId, labelIds);
        var column = projectFacade.requireColumn(actor, workspaceId, projectId, columnId);
        long number = projectFacade.allocateIssueNumber(actor, workspaceId, projectId);
        double position = issueRepository.findColumnItems(projectId, columnId, false).stream()
                        .mapToDouble(Issue::position)
                        .max()
                        .orElse(-1)
                + 1;
        var w = Issue.create(
                projectId,
                number,
                details,
                labelIds,
                columnId,
                column.finalColumn(),
                position,
                actor.userId(),
                agent(actor),
                clock.instant());
        issueRepository.save(w);
        changed(actor, workspaceId, w, "created", List.of());
        return w.id();
    }

    @Transactional
    public void revise(
            CurrentUser actor, String workspaceId, String projectId, String id, IssueRequests.Update request) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, request.getExpectedVersion());
        var d = w.details();
        var next = new Issue.Details(
                request.hasTitle() ? request.getTitle() : d.title(),
                request.hasDescription() ? request.getDescription() : d.description(),
                request.hasPriority() ? request.getPriority() : d.priority(),
                request.hasTriggerType() ? request.getTriggerType() : d.triggerType(),
                request.hasAssigneeId() ? request.getAssigneeId() : d.assigneeId(),
                request.hasStartDate() ? request.getStartDate() : d.startDate(),
                request.hasDueDate() ? request.getDueDate() : d.dueDate());
        validateDates(next);
        if (!Objects.equals(next.assigneeId(), d.assigneeId())) assignee(actor, workspaceId, next.assigneeId());
        var labelIds = request.hasLabelIds() ? request.labels() : w.labelIds();
        if (!labelIds.equals(w.labelIds())) labels(actor, workspaceId, labelIds);
        long before = w.version();
        var previousLabels = w.labelIds();
        w.revise(next, labelIds, actor.userId(), agent(actor), clock.instant());
        if (w.version() == before) return;
        issueRepository.save(w);
        var changes = new ArrayList<FieldChange>();
        field(changes, "title", d.title(), next.title());
        // A description is written in place and saved as it is typed: the activity says it changed, not what it said.
        if (!Objects.equals(d.description(), next.description()))
            changes.add(new FieldChange("description", null, null));
        field(changes, "priority", text(d.priority()), text(next.priority()));
        field(changes, "assignee", text(d.assigneeId()), text(next.assigneeId()));
        field(changes, "startDate", text(d.startDate()), text(next.startDate()));
        field(changes, "dueDate", text(d.dueDate()), text(next.dueDate()));
        field(changes, "labels", ids(previousLabels), ids(labelIds));
        if (!changes.isEmpty()) changed(actor, workspaceId, w, "changed", changes);
    }

    @Transactional
    public void move(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String id,
            long expectedVersion,
            String targetColumnId,
            String beforeItemId,
            String afterItemId) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, expectedVersion);
        var target = projectFacade.requireColumn(actor, workspaceId, projectId, targetColumnId);
        if (id.equals(beforeItemId) || id.equals(afterItemId)) throw IssueErrorCode.ISSUE_MOVE_INVALID.raise();
        if (Objects.equals(w.columnId(), targetColumnId) && beforeItemId == null && afterItemId == null) return;
        String previous = w.columnId();
        var ordered = new ArrayList<>(issueRepository.findColumnItems(projectId, targetColumnId, false));
        ordered.removeIf(item -> item.id().equals(id));
        int before = index(ordered, beforeItemId);
        int after = index(ordered, afterItemId);
        if (beforeItemId != null && before < 0
                || afterItemId != null && after < 0
                || beforeItemId != null && afterItemId != null && after + 1 != before)
            throw IssueErrorCode.ISSUE_MOVE_INVALID.raise();
        int at = beforeItemId != null ? before : afterItemId != null ? after + 1 : ordered.size();
        ordered.add(at, w);
        applyOrder(actor, ordered, targetColumnId, target.finalColumn());
        if (!Objects.equals(previous, targetColumnId)) {
            var old = projectFacade.requireColumn(actor, workspaceId, projectId, previous);
            applyOrder(actor, issueRepository.findColumnItems(projectId, previous, false), previous, old.finalColumn());
            changed(
                    actor,
                    workspaceId,
                    w,
                    "changed",
                    List.of(new FieldChange("column", text(previous), text(targetColumnId))));
        }
    }

    @Transactional
    public void archive(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String id,
            long expectedVersion,
            boolean archived) {
        var w = access(actor, workspaceId, projectId, id, true, false);
        version(w, expectedVersion);
        boolean was = w.archivedAt() != null;
        w.archive(archived, actor.userId(), agent(actor), clock.instant());
        issueRepository.save(w);
        if (was != archived)
            changed(actor, workspaceId, w, "changed", List.of(new FieldChange("archived", text(was), text(archived))));
    }

    @Transactional
    public void delete(CurrentUser actor, String workspaceId, String projectId, String id, long expectedVersion) {
        var w = access(actor, workspaceId, projectId, id, true, true);
        version(w, expectedVersion);
        w.delete(actor.userId(), agent(actor), clock.instant());
        issueRepository.save(w);
        changed(actor, workspaceId, w, "deleted", List.of());
    }

    @Transactional
    public void restore(CurrentUser actor, String workspaceId, String projectId, String id, long expectedVersion) {
        var w = access(actor, workspaceId, projectId, id, true, true);
        version(w, expectedVersion);
        var existing = projectFacade.findColumn(actor, workspaceId, projectId, w.columnId());
        var column = existing.orElse(new ProjectFacade.ColumnRef(null, false, null));
        w.restore(existing.isPresent(), actor.userId(), agent(actor), clock.instant());
        w.move(column.id(), column.finalColumn(), w.position(), actor.userId(), agent(actor), clock.instant());
        issueRepository.save(w);
        changed(actor, workspaceId, w, "restored", List.of());
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void reclassify(
            CurrentUser actor, String workspaceId, String projectId, String columnId, boolean finalColumn) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        applyOrder(actor, issueRepository.findColumnItems(projectId, columnId, true), columnId, finalColumn);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void transfer(
            CurrentUser actor,
            String workspaceId,
            String projectId,
            String sourceColumnId,
            String targetColumnId,
            boolean targetFinal) {
        projectFacade.requireSettings(actor, workspaceId, projectId, false, false);
        var ordered = new ArrayList<>(issueRepository.findColumnItems(projectId, targetColumnId, false));
        ordered.addAll(issueRepository.findColumnItems(projectId, sourceColumnId, false));
        applyOrder(actor, ordered, targetColumnId, targetFinal);
    }

    private Issue access(
            CurrentUser actor, String workspaceId, String projectId, String id, boolean writing, boolean deleted) {
        projectFacade.requireAccess(actor, workspaceId, projectId, writing);
        if (deleted) workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        return issueRepository.findById(projectId, id, deleted).orElseThrow(IssueErrorCode.ISSUE_NOT_FOUND::raise);
    }

    private void applyOrder(CurrentUser actor, List<Issue> ordered, String columnId, boolean finalColumn) {
        for (int i = 0; i < ordered.size(); i++) {
            var item = ordered.get(i);
            long before = item.version();
            item.move(columnId, finalColumn, i, actor.userId(), agent(actor), clock.instant());
            if (item.version() != before) issueRepository.save(item);
        }
    }

    private static int index(List<Issue> items, String id) {
        if (id == null) return -1;
        for (int i = 0; i < items.size(); i++) if (items.get(i).id().equals(id)) return i;
        return -1;
    }

    private void assignee(CurrentUser actor, String workspaceId, String userId) {
        if (userId != null && !workspaceFacade.hasMember(actor, workspaceId, userId))
            throw IssueErrorCode.ISSUE_ASSIGNEE_NOT_MEMBER.raise();
    }

    /** Every label must be a live label of this workspace; deleted or foreign ids are rejected as one error. */
    private void labels(CurrentUser actor, String workspaceId, Set<String> labelIds) {
        if (!labelIds.isEmpty()
                && labelFacade.findAllById(actor, workspaceId, labelIds).size() != labelIds.size())
            throw IssueErrorCode.ISSUE_LABEL_INVALID.raise();
    }

    private static void validateDates(Issue.Details details) {
        if (details.startDate() != null
                && details.dueDate() != null
                && details.startDate().isAfter(details.dueDate()))
            throw IssueErrorCode.ISSUE_DATE_RANGE_INVALID.raise();
    }

    /** Records what happened to an issue in its activity (D-078): safe values only, ids for people, columns and labels. */
    private void changed(CurrentUser actor, String workspaceId, Issue item, String action, List<FieldChange> changes) {
        applicationEventPublisher.publishEvent(new TargetChangedEvent(
                workspaceId,
                item.projectId(),
                TargetType.issue,
                item.id(),
                action,
                item.version(),
                actor.userId(),
                agent(actor),
                item.audit().updatedAt(),
                changes));
    }

    private static void field(List<FieldChange> changes, String field, String before, String after) {
        if (!Objects.equals(before, after)) changes.add(new FieldChange(field, before, after));
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    /** Label ids in a stable order, joined by commas; null for none. */
    private static String ids(Set<String> ids) {
        return ids.isEmpty() ? null : ids.stream().sorted().collect(Collectors.joining(","));
    }

    private static void version(Issue item, long expected) {
        if (item.version() != expected) throw IssueErrorCode.ISSUE_VERSION_CONFLICT.raise();
    }

    private static String agent(CurrentUser actor) {
        return actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null;
    }
}
