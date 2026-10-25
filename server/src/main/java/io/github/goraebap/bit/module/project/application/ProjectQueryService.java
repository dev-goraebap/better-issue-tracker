package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.module.project.domain.BoardColumn;
import io.github.goraebap.bit.module.project.domain.ProjectRepository;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.SecretTokens;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectQueryService {
    private final ProjectRepository projectRepository;
    private final WorkspaceFacade workspaceFacade;
    private final SecretTokens secretTokens;

    @Transactional(readOnly = true)
    public ProjectViews.ProjectInfo get(CurrentUser actor, UUID workspaceId, UUID projectId) {
        workspaceFacade.requireAccess(actor, workspaceId, WorkspaceFacade.Action.READ);
        var p = projectRepository
                .findById(workspaceId, projectId, false)
                .orElseThrow(ProjectErrorCode.PROJECT_NOT_FOUND::raise);
        return view(new ProjectRepository.Row(
                p.id(),
                p.workspaceId(),
                p.name(),
                projectRepository.currentKey(p.id()),
                p.description(),
                p.icon(),
                p.color(),
                p.archivedAt(),
                p.version(),
                p.audit()));
    }

    @Transactional(readOnly = true)
    public ProjectViews.Projects list(
            CurrentUser actor,
            UUID workspaceId,
            String status,
            String q,
            String cursor,
            int size,
            String sort,
            String direction) {
        workspaceFacade.requireAccess(
                actor,
                workspaceId,
                "deleted".equals(status) ? WorkspaceFacade.Action.EDIT_SETTINGS : WorkspaceFacade.Action.READ);
        if (!Set.of("active", "archived", "deleted").contains(status)
                || size < 1
                || size > 100
                || !"createdAt".equals(sort)
                || !"DESC".equals(direction)) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        String query = q == null ? "" : q.strip();
        if (query.length() > 200) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        String scope =
                secretTokens.hash("project-list", actor.userId() + ":" + workspaceId + ":" + status + ":" + query);
        var point = decode(cursor, scope);
        var rows = projectRepository.findAll(workspaceId, status, query, point.time(), point.id(), size + 1);
        var page = rows.stream().limit(size).toList();
        String next = rows.size() > size
                ? encode(
                        scope,
                        page.getLast().audit().createdAt(),
                        page.getLast().id())
                : null;
        return new ProjectViews.Projects(page.stream().map(this::view).toList(), next);
    }

    @Transactional(readOnly = true)
    public List<ProjectViews.Column> columns(CurrentUser actor, UUID workspaceId, UUID projectId) {
        get(actor, workspaceId, projectId);
        return projectRepository.findColumns(projectId).stream()
                .map(ProjectQueryService::column)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectViews.Column column(CurrentUser actor, UUID workspaceId, UUID projectId, UUID columnId) {
        get(actor, workspaceId, projectId);
        var c = projectRepository
                .findColumn(projectId, columnId)
                .orElseThrow(ProjectErrorCode.PROJECT_COLUMN_NOT_FOUND::raise);
        return column(c);
    }

    private static ProjectViews.Column column(BoardColumn c) {
        return new ProjectViews.Column(
                c.id(), c.name(), c.color(), c.position(), c.finalColumn(), c.category(), c.version());
    }

    private ProjectViews.ProjectInfo view(ProjectRepository.Row row) {
        var a = row.audit();
        return new ProjectViews.ProjectInfo(
                row.id(),
                row.workspaceId(),
                row.name(),
                row.key(),
                row.description(),
                row.icon(),
                row.color(),
                row.archivedAt(),
                a.deletedAt(),
                row.version(),
                a.createdAt(),
                a.createdBy(),
                a.createdByAgent(),
                a.updatedAt());
    }

    private record Point(Instant time, UUID id) {}

    private static Point decode(String cursor, String scope) {
        if (cursor == null) return new Point(null, null);
        if (cursor.length() > 1024) throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", -1);
            if (parts.length != 3 || !parts[0].equals(scope)) throw new IllegalArgumentException("cursor");
            return new Point(Instant.parse(parts[1]), UUID.fromString(parts[2]));
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }

    private static String encode(String scope, Instant time, UUID id) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((scope + "|" + time + "|" + id).getBytes(StandardCharsets.UTF_8));
    }
}
