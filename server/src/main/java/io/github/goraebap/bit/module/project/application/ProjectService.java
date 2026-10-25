package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.module.project.ColumnCategory;
import io.github.goraebap.bit.module.project.ColumnWorkItemSpi;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.project.domain.BoardColumn;
import io.github.goraebap.bit.module.project.domain.Project;
import io.github.goraebap.bit.module.project.domain.ProjectKey;
import io.github.goraebap.bit.module.project.domain.ProjectRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectService implements ProjectFacade {
    private final ProjectRepository projectRepository;
    private final WorkspaceFacade workspaceFacade;
    private final ObjectProvider<ColumnWorkItemSpi> columnWorkItemSpiProvider;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public void requireSettings(
            CurrentUser actor, UUID workspaceId, UUID projectId, boolean includeDeleted, boolean allowArchived) {
        settings(actor, workspaceId, projectId, includeDeleted, allowArchived);
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectRef requireAccess(CurrentUser actor, UUID workspaceId, UUID projectId, boolean writing) {
        var p = access(actor, workspaceId, projectId, writing, false);
        return ref(p);
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectRef findByKey(CurrentUser actor, UUID workspaceId, String key) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var found = projectRepository
                .findKey(workspaceId, ProjectKey.of(key).value())
                .orElseThrow(ProjectErrorCode.PROJECT_NOT_FOUND::raise);
        return ref(project(workspaceId, found.projectId(), false));
    }

    @Override
    @Transactional
    public long allocateWorkItemNumber(CurrentUser actor, UUID workspaceId, UUID projectId) {
        var p = access(actor, workspaceId, projectId, true, false);
        long number = p.allocateWorkItemNumber();
        projectRepository.save(p);
        return number;
    }

    @Override
    @Transactional
    public long allocateDecisionNumber(CurrentUser actor, UUID workspaceId, UUID projectId) {
        return allocateDecisionNumbers(actor, workspaceId, projectId, 1);
    }

    @Override
    @Transactional
    public long allocateDecisionNumbers(CurrentUser actor, UUID workspaceId, UUID projectId, int count) {
        if (count < 1 || count > 20) throw new IllegalArgumentException("Invalid decision count");
        var p = access(actor, workspaceId, projectId, true, false);
        long number = p.allocateDecisionNumber();
        for (int i = 1; i < count; i++) p.allocateDecisionNumber();
        projectRepository.save(p);
        return number;
    }

    @Override
    @Transactional
    public long allocateSessionNumber(CurrentUser actor, UUID workspaceId, UUID projectId) {
        var p = access(actor, workspaceId, projectId, true, false);
        long number = p.allocateSessionNumber();
        projectRepository.save(p);
        return number;
    }

    @Override
    @Transactional(readOnly = true)
    public ColumnRef requireColumn(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId) {
        return findColumn(actor, workspaceId, projectId, columnId)
                .orElseThrow(ProjectErrorCode.PROJECT_COLUMN_NOT_FOUND::raise);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ColumnRef> findColumn(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId) {
        access(actor, workspaceId, projectId, false, false);
        if (columnId == null) return Optional.of(new ColumnRef(null, false, null));
        return projectRepository
                .findColumn(projectId, columnId)
                .map(c -> new ColumnRef(c.id(), c.finalColumn(), c.category()));
    }

    @Transactional
    public UUID create(CurrentUser actor, UUID workspaceId, String name, String key, String description) {
        return create(actor, workspaceId, name, key, description, null, null);
    }

    @Transactional
    public UUID create(
            CurrentUser actor,
            UUID workspaceId,
            String name,
            String key,
            String description,
            String icon,
            String color) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.EDIT_SETTINGS);
        var normalized = ProjectKey.of(key);
        assertKeyAvailable(workspaceId, normalized, null);
        var p = Project.create(
                workspaceId,
                name,
                description,
                icon,
                color,
                projectRepository.nextPosition(workspaceId),
                actor.userId(),
                agent(actor),
                clock.instant());
        projectRepository.save(p);
        projectRepository.switchKey(workspaceId, p.id(), normalized, clock.instant());
        var names = List.of("할 일", "진행 중", "검토 중", "완료");
        var categories = List.of(ColumnCategory.todo, ColumnCategory.doing, ColumnCategory.doing, ColumnCategory.done);
        for (int i = 0; i < names.size(); i++) {
            projectRepository.save(BoardColumn.create(
                    p.id(),
                    names.get(i),
                    null,
                    i,
                    i == 3,
                    categories.get(i),
                    actor.userId(),
                    agent(actor),
                    clock.instant()));
        }
        return p.id();
    }

    @Transactional
    public void revise(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            long version,
            String name,
            boolean hasName,
            String key,
            boolean hasKey,
            String description,
            boolean hasDescription) {
        revise(
                actor,
                workspaceId,
                projectId,
                version,
                name,
                hasName,
                key,
                hasKey,
                description,
                hasDescription,
                null,
                false,
                null,
                false);
    }

    @Transactional
    public void revise(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            long version,
            String name,
            boolean hasName,
            String key,
            boolean hasKey,
            String description,
            boolean hasDescription,
            String icon,
            boolean hasIcon,
            String color,
            boolean hasColor) {
        var p = settings(actor, workspaceId, projectId, false, false);
        version(p.version(), version);
        if (!hasName && !hasKey && !hasDescription && !hasIcon && !hasColor) return;
        var normalized = hasKey ? ProjectKey.of(key) : null;
        if (normalized != null) assertKeyAvailable(workspaceId, normalized, projectId);
        if (!hasName
                && !hasDescription
                && !hasIcon
                && !hasColor
                && normalized != null
                && normalized.value().equals(projectRepository.currentKey(projectId))) return;
        p.revise(
                hasName ? name : p.name(),
                hasDescription ? description : p.description(),
                hasIcon ? icon : p.icon(),
                hasColor ? color : p.color(),
                actor.userId(),
                agent(actor),
                clock.instant());
        projectRepository.save(p);
        if (normalized != null) projectRepository.switchKey(workspaceId, projectId, normalized, clock.instant());
    }

    @Transactional
    public void archive(CurrentUser actor, UUID workspaceId, UUID projectId, long version, boolean archived) {
        var p = settings(actor, workspaceId, projectId, false, true);
        version(p.version(), version);
        p.archive(archived, actor.userId(), agent(actor), clock.instant());
        projectRepository.save(p);
    }

    @Transactional
    public void delete(CurrentUser actor, UUID workspaceId, UUID projectId, long version) {
        var p = settings(actor, workspaceId, projectId, true, true);
        version(p.version(), version);
        p.delete(actor.userId(), agent(actor), clock.instant());
        projectRepository.save(p);
    }

    @Transactional
    public void restore(CurrentUser actor, UUID workspaceId, UUID projectId, long version) {
        var p = settings(actor, workspaceId, projectId, true, true);
        version(p.version(), version);
        p.restore(actor.userId(), agent(actor), clock.instant());
        projectRepository.save(p);
    }

    @Transactional(readOnly = true)
    public List<BoardColumn> columns(CurrentUser actor, UUID workspaceId, UUID projectId) {
        access(actor, workspaceId, projectId, false, false);
        return projectRepository.findColumns(projectId);
    }

    @Transactional
    public UUID addColumn(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            long version,
            String name,
            String color,
            boolean finalColumn,
            ColumnCategory category) {
        var p = settings(actor, workspaceId, projectId, false, false);
        version(p.version(), version);
        var resolved = category(finalColumn, category, null);
        int position = projectRepository.findColumns(projectId).stream()
                        .mapToInt(BoardColumn::position)
                        .max()
                        .orElse(-1)
                + 1;
        var c = BoardColumn.create(
                projectId, name, color, position, finalColumn, resolved, actor.userId(), agent(actor), clock.instant());
        projectRepository.save(c);
        touch(p, actor);
        return c.id();
    }

    @Transactional
    public void reviseColumn(
            CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId, ProjectRequests.ReviseColumn request) {
        settings(actor, workspaceId, projectId, false, false);
        var c = column(projectId, columnId);
        version(c.version(), request.getExpectedVersion());
        if (request.hasIsFinal() && request.getIsFinal() == null
                || request.hasCategory() && request.getCategory() == null)
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        if (!request.hasName() && !request.hasColor() && !request.hasIsFinal() && !request.hasCategory()) return;
        reviseColumn(
                actor,
                workspaceId,
                projectId,
                columnId,
                request.getExpectedVersion(),
                request.hasName() ? request.getName() : c.name(),
                request.hasColor() ? request.getColor() : c.color(),
                request.hasIsFinal() ? request.getIsFinal() : c.finalColumn(),
                request.hasCategory() ? request.getCategory() : null);
    }

    @Transactional
    public void reviseColumn(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            UUID columnId,
            long version,
            String name,
            String color,
            boolean finalColumn) {
        reviseColumn(actor, workspaceId, projectId, columnId, version, name, color, finalColumn, null);
    }

    /** A null category keeps the current one, moving it to done or doing only when finality changes. */
    @Transactional
    public void reviseColumn(
            CurrentUser actor,
            UUID workspaceId,
            UUID projectId,
            UUID columnId,
            long version,
            String name,
            String color,
            boolean finalColumn,
            ColumnCategory category) {
        var p = settings(actor, workspaceId, projectId, false, false);
        var c = column(projectId, columnId);
        version(c.version(), version);
        var resolved = category(finalColumn, category, c);
        if (c.finalColumn() && !finalColumn) assertAnotherFinal(projectId, columnId);
        boolean changed = c.finalColumn() != finalColumn;
        c.configure(name, color, finalColumn, resolved, actor.userId(), agent(actor), clock.instant());
        projectRepository.save(c);
        if (changed)
            columnWorkItemSpiProvider.getObject().reclassify(actor, workspaceId, projectId, columnId, finalColumn);
        touch(p, actor);
    }

    @Transactional
    public void deleteColumn(
            CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId, long version, UUID targetColumnId) {
        var p = settings(actor, workspaceId, projectId, false, false);
        var c = column(projectId, columnId);
        version(c.version(), version);
        if (projectRepository.findColumns(projectId).size() == 1)
            throw ProjectErrorCode.PROJECT_COLUMN_REQUIRED.raise();
        if (c.finalColumn()) assertAnotherFinal(projectId, columnId);
        if (columnId.equals(targetColumnId)) throw ProjectErrorCode.PROJECT_COLUMN_TARGET_INVALID.raise();
        var target = targetColumnId == null ? null : column(projectId, targetColumnId);
        columnWorkItemSpiProvider
                .getObject()
                .transfer(
                        actor,
                        workspaceId,
                        projectId,
                        columnId,
                        targetColumnId,
                        target != null && target.finalColumn());
        c.delete(actor.userId(), agent(actor), clock.instant());
        projectRepository.save(c);
        touch(p, actor);
    }

    @Transactional
    public void reorderColumns(CurrentUser actor, UUID workspaceId, UUID projectId, long version, List<UUID> order) {
        var p = settings(actor, workspaceId, projectId, false, false);
        version(p.version(), version);
        var columns = projectRepository.findColumns(projectId);
        if (order == null
                || order.size() != columns.size()
                || new HashSet<>(order).size() != order.size()
                || !new HashSet<>(order)
                        .equals(new HashSet<>(
                                columns.stream().map(BoardColumn::id).toList())))
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        for (var c : columns) {
            c.reorder(order.indexOf(c.id()), actor.userId(), agent(actor), clock.instant());
            projectRepository.save(c);
        }
        touch(p, actor);
    }

    private Project access(CurrentUser actor, UUID workspaceId, UUID projectId, boolean writing, boolean deleted) {
        workspaceFacade.requireAccess(
                actor, workspaceId, writing ? WorkspaceFacade.Action.WRITE_WORK : WorkspaceFacade.Action.READ);
        var p = project(workspaceId, projectId, deleted);
        if (writing && p.archivedAt() != null) throw ProjectErrorCode.PROJECT_ARCHIVED.raise();
        return p;
    }

    private Project settings(
            CurrentUser actor, UUID workspaceId, UUID projectId, boolean deleted, boolean allowArchived) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.EDIT_SETTINGS);
        var p = project(workspaceId, projectId, deleted);
        if (!allowArchived && p.archivedAt() != null) throw ProjectErrorCode.PROJECT_ARCHIVED.raise();
        return p;
    }

    private Project project(UUID workspaceId, UUID projectId, boolean deleted) {
        return projectRepository
                .findById(workspaceId, projectId, deleted)
                .orElseThrow(ProjectErrorCode.PROJECT_NOT_FOUND::raise);
    }

    private BoardColumn column(UUID projectId, UUID columnId) {
        return projectRepository
                .findColumn(projectId, columnId)
                .orElseThrow(ProjectErrorCode.PROJECT_COLUMN_NOT_FOUND::raise);
    }

    private ProjectRef ref(Project p) {
        return new ProjectRef(
                p.id(), p.workspaceId(), projectRepository.currentKey(p.id()), p.version(), p.archivedAt() != null);
    }

    private void assertKeyAvailable(UUID workspaceId, ProjectKey key, UUID projectId) {
        var existing = projectRepository.findKey(workspaceId, key.value());
        if (existing.isPresent() && !existing.get().projectId().equals(projectId))
            throw ProjectErrorCode.PROJECT_KEY_CONFLICT.raise();
    }

    private static ColumnCategory category(boolean finalColumn, ColumnCategory requested, BoardColumn current) {
        if (requested != null) {
            if (!BoardColumn.allows(finalColumn, requested))
                throw ProjectErrorCode.PROJECT_COLUMN_CATEGORY_INVALID.raise();
            return requested;
        }
        if (finalColumn) return ColumnCategory.done;
        if (current == null || current.finalColumn()) return ColumnCategory.doing;
        return current.category();
    }

    private void assertAnotherFinal(UUID projectId, UUID columnId) {
        if (projectRepository.findColumns(projectId).stream()
                .noneMatch(c -> c.finalColumn() && !c.id().equals(columnId)))
            throw ProjectErrorCode.PROJECT_FINAL_COLUMN_REQUIRED.raise();
    }

    private void touch(Project p, CurrentUser actor) {
        p.touch(actor.userId(), agent(actor), clock.instant());
        projectRepository.save(p);
    }

    private static String agent(CurrentUser actor) {
        return actor.method() == CurrentUser.Method.API_KEY ? actor.agentName() : null;
    }

    private static void version(long actual, long expected) {
        if (actual != expected) throw ProjectErrorCode.PROJECT_VERSION_CONFLICT.raise();
    }
}
