package io.github.goraebap.bit.module.view.application;

import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.view.ViewFacade;
import io.github.goraebap.bit.module.view.domain.ViewOrder;
import io.github.goraebap.bit.module.view.domain.ViewRepository;
import io.github.goraebap.bit.module.view.domain.ViewTweak;
import io.github.goraebap.bit.module.view.domain.WorkItemView;
import io.github.goraebap.bit.module.workspace.WorkspaceCreatedEvent;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
@RequiredArgsConstructor
public class ViewService implements ViewFacade {
    private final ViewRepository viewRepository;
    private final WorkspaceFacade workspaceFacade;
    private final ProjectFacade projectFacade;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public void requireAccess(CurrentUser actor, String workspaceId, String viewKey, boolean editing) {
        var rights = rights(actor, workspaceId);
        if (WorkItemView.ALL.equals(viewKey)) {
            if (editing) throw ViewErrorCode.VIEW_NOT_FOUND.raise();
            return;
        }
        var view = visible(rights, workspaceId, id(viewKey));
        if (editing && !rights.edits(view)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
    }

    @Transactional(readOnly = true)
    public List<ViewViews.View> list(CurrentUser actor, String workspaceId) {
        var rights = rights(actor, workspaceId);
        return viewRepository.findAllVisible(workspaceId, actor.userId()).stream()
                .map(view -> view(view, rights))
                .toList();
    }

    @Transactional(readOnly = true)
    public ViewViews.View get(CurrentUser actor, String workspaceId, String viewId) {
        var rights = rights(actor, workspaceId);
        return view(visible(rights, workspaceId, viewId), rights);
    }

    @Transactional(readOnly = true)
    public List<ViewViews.Tweak> tweaks(CurrentUser actor, String workspaceId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var keys = new HashSet<String>();
        keys.add(WorkItemView.ALL);
        viewRepository.findAllVisible(workspaceId, actor.userId()).forEach(v -> keys.add(v.id()));
        // A view that became someone else's personal view or was deleted keeps no visible tweak.
        return viewRepository.findTweaks(workspaceId, actor.userId()).stream()
                .filter(t -> keys.contains(t.viewKey()))
                .map(t -> new ViewViews.Tweak(t.viewKey(), t.layout(), sort(t.sort()), t.columns(), t.grouping()))
                .toList();
    }

    /** Each scope's order as the caller sees it: the views out of their sight are left out. */
    @Transactional(readOnly = true)
    public List<ViewViews.Order> orders(CurrentUser actor, String workspaceId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var seen = visibleKeys(workspaceId, actor.userId());
        return viewRepository.findOrders(workspaceId).stream()
                .map(order -> new ViewViews.Order(
                        order.scope(),
                        order.viewKeys().stream().filter(seen::contains).toList()))
                .toList();
    }

    /**
     * Puts a scope's views in a new order, its first the scope's default (D-088). The home's is the workspace's to
     * set, so its admins'; a project's is the project's managers'. Only views the caller sees may be named; those it
     * cannot see (another member's personal views) keep their places after them.
     */
    @Transactional
    public void putOrder(CurrentUser actor, String workspaceId, String scope, ViewRequests.PutOrder request) {
        if (!ViewOrder.validScope(scope)) throw ViewErrorCode.VIEW_NOT_FOUND.raise();
        if (ViewOrder.HOME.equals(scope))
            workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.EDIT_SETTINGS);
        else projectFacade.requireSettings(actor, workspaceId, scope, false, false);
        var seen = visibleKeys(workspaceId, actor.userId());
        var keys = request.viewKeys();
        if (!ViewOrder.validKeys(keys) || !seen.containsAll(keys)) throw ViewErrorCode.VIEW_ORDER_INVALID.raise();
        var next = new ArrayList<>(keys);
        viewRepository.findOrder(workspaceId, scope).ifPresent(before -> before.viewKeys().stream()
                .filter(key -> !seen.contains(key))
                .forEach(next::add));
        if (next.size() > ViewOrder.MAX_KEYS) throw ViewErrorCode.VIEW_ORDER_INVALID.raise();
        viewRepository.saveOrder(
                new ViewOrder(workspaceId, scope, next, clock.instant(), actor.userId(), agent(actor)));
    }

    @Transactional
    public String create(CurrentUser actor, String workspaceId, ViewRequests.Create request) {
        workspaceFacade.requireAccess(
                actor,
                workspaceId,
                request.isPersonal() ? WorkspaceFacade.Action.READ : WorkspaceFacade.Action.WRITE_WORK);
        var definition = definition(
                request.name(),
                request.description(),
                request.icon(),
                request.color(),
                request.layout(),
                request.filters(),
                request.sort(),
                request.columns(),
                request.grouping());
        var view = WorkItemView.create(
                workspaceId,
                actor.userId(),
                request.isPersonal(),
                definition,
                viewRepository.nextPosition(workspaceId),
                agent(actor),
                clock.instant());
        viewRepository.save(view);
        return view.id();
    }

    @Transactional
    public void revise(CurrentUser actor, String workspaceId, String viewId, ViewRequests.Update request) {
        var rights = rights(actor, workspaceId);
        var view = visible(rights, workspaceId, viewId);
        if (!rights.edits(view)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        version(view, request.getExpectedVersion());
        if (request.hasIsPersonal() && request.getIsPersonal() == null
                || request.hasGrouping() && request.getGrouping() == null) throw ViewErrorCode.VIEW_INVALID.raise();
        boolean personal = request.hasIsPersonal() ? request.getIsPersonal() : view.personal();
        if (personal != view.personal() && (!view.ownerId().equals(actor.userId()) || !personal && !rights.writer()))
            throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        var d = view.definition();
        var next = definition(
                request.hasName() ? request.getName() : d.name(),
                request.hasDescription() ? request.getDescription() : d.description(),
                request.hasIcon() ? request.getIcon() : d.icon(),
                request.hasColor() ? request.getColor() : d.color(),
                request.hasLayout() ? request.getLayout() : d.layout(),
                request.hasFilters() ? request.getFilters() : d.filters(),
                request.hasSort() ? request.getSort() : sort(d.sort()),
                request.hasColumns() ? request.getColumns() : d.columns(),
                request.hasGrouping() ? request.getGrouping() : d.grouping());
        long before = view.version();
        view.revise(next, personal, actor.userId(), agent(actor), clock.instant());
        if (view.version() != before) viewRepository.save(view);
    }

    @Transactional
    public void delete(CurrentUser actor, String workspaceId, String viewId, long expectedVersion) {
        var rights = rights(actor, workspaceId);
        var view = visible(rights, workspaceId, viewId);
        if (!rights.edits(view)) throw CommonErrorCode.AUTH_FORBIDDEN.raise();
        version(view, expectedVersion);
        view.delete(actor.userId(), agent(actor), clock.instant());
        viewRepository.save(view);
        viewRepository.deleteAllTweaksByViewKey(workspaceId, viewId);
    }

    @Transactional
    public void putTweak(CurrentUser actor, String workspaceId, String viewKey, ViewRequests.PutTweak request) {
        requireAccess(actor, workspaceId, viewKey, false);
        if (!ViewTweak.validColumns(request.columns())) throw ViewErrorCode.VIEW_COLUMNS_INVALID.raise();
        var sort = request.sort() == null ? null : domainSort(request.sort());
        String key = key(viewKey);
        var tweak = new ViewTweak(
                workspaceId,
                actor.userId(),
                key,
                request.layout(),
                sort,
                request.columns(),
                request.grouping(),
                clock.instant());
        if (tweak.isEmpty()) viewRepository.deleteTweak(workspaceId, actor.userId(), key);
        else viewRepository.saveTweak(tweak);
    }

    @Transactional
    public void deleteTweak(CurrentUser actor, String workspaceId, String viewKey) {
        requireAccess(actor, workspaceId, viewKey, false);
        viewRepository.deleteTweak(workspaceId, actor.userId(), key(viewKey));
    }

    /** Seeds the starter views in the workspace's own transaction, as label seeds the decision label. */
    @Transactional(propagation = Propagation.MANDATORY)
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void seed(WorkspaceCreatedEvent event) {
        viewRepository.saveAll(
                WorkItemView.starters(event.workspaceId(), event.actorId(), event.actorAgent(), event.occurredAt()));
    }

    /** 전체 업무 and the views the user sees, by key. */
    private Set<String> visibleKeys(String workspaceId, String userId) {
        var keys = new HashSet<String>();
        keys.add(WorkItemView.ALL);
        viewRepository.findAllVisible(workspaceId, userId).forEach(view -> keys.add(view.id()));
        return keys;
    }

    private record Rights(String me, boolean writer, boolean admin) {
        boolean edits(WorkItemView view) {
            if (view.personal()) return view.ownerId().equals(me);
            return admin || writer && view.ownerId().equals(me);
        }
    }

    private Rights rights(CurrentUser actor, String workspaceId) {
        boolean writer = workspaceFacade.allows(actor, workspaceId, WorkspaceFacade.Action.WRITE_WORK);
        boolean admin = writer && workspaceFacade.allows(actor, workspaceId, WorkspaceFacade.Action.EDIT_SETTINGS);
        return new Rights(actor.userId(), writer, admin);
    }

    private WorkItemView visible(Rights rights, String workspaceId, String viewId) {
        return viewRepository
                .findById(workspaceId, viewId)
                .filter(view -> view.visibleTo(rights.me()))
                .orElseThrow(ViewErrorCode.VIEW_NOT_FOUND::raise);
    }

    /** Tweaks are stored under "all" or the view id's canonical text. */
    private static String key(String viewKey) {
        return WorkItemView.ALL.equals(viewKey) ? WorkItemView.ALL : id(viewKey);
    }

    private static String id(String viewKey) {
        try {
            return Ids.parse(viewKey);
        } catch (IllegalArgumentException invalid) {
            throw ViewErrorCode.VIEW_NOT_FOUND.raise();
        }
    }

    private static WorkItemView.Definition definition(
            String name,
            String description,
            String icon,
            String color,
            WorkItemView.Layout layout,
            Map<String, String> filters,
            ViewViews.Sort sort,
            List<WorkItemView.Column> columns,
            WorkItemView.Grouping grouping) {
        var domainSort = sort == null ? null : domainSort(sort);
        var problem =
                WorkItemView.Definition.check(name, description, icon, color, layout, filters, domainSort, columns);
        if (problem.isPresent())
            throw switch (problem.get()) {
                case FILTERS -> ViewErrorCode.VIEW_FILTERS_INVALID.raise();
                case COLUMNS -> ViewErrorCode.VIEW_COLUMNS_INVALID.raise();
                case DEFINITION -> ViewErrorCode.VIEW_INVALID.raise();
            };
        return WorkItemView.Definition.of(
                name, description, icon, color, layout, filters, domainSort, columns, grouping);
    }

    private static WorkItemView.Sort domainSort(ViewViews.Sort sort) {
        if (sort.key() == null || sort.direction() == null) throw ViewErrorCode.VIEW_INVALID.raise();
        return new WorkItemView.Sort(sort.key(), sort.direction());
    }

    private static ViewViews.Sort sort(WorkItemView.Sort sort) {
        return sort == null ? null : new ViewViews.Sort(sort.key(), sort.direction());
    }

    private static void version(WorkItemView view, Long expected) {
        if (expected == null || view.version() != expected) throw ViewErrorCode.VIEW_VERSION_CONFLICT.raise();
    }

    private static ViewViews.View view(WorkItemView view, Rights rights) {
        var d = view.definition();
        var f = d.filters();
        var a = view.audit();
        return new ViewViews.View(
                view.id(),
                view.workspaceId(),
                d.name(),
                d.description(),
                d.icon(),
                d.color(),
                d.layout(),
                new ViewViews.Filters(f.get("status"), f.get("priority"), f.get("assignee"), f.get("label")),
                sort(d.sort()),
                d.columns(),
                d.grouping(),
                view.ownerId(),
                view.personal(),
                rights.edits(view),
                view.position(),
                view.version(),
                a.createdAt(),
                a.updatedAt());
    }

    private static String agent(CurrentUser actor) {
        return actor.agent();
    }
}
