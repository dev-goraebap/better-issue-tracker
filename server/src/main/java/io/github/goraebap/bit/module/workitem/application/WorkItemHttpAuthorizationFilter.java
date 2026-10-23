package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.ProblemResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.web.filter.OncePerRequestFilter;

final class WorkItemHttpAuthorizationFilter extends OncePerRequestFilter {
    private static final Pattern PATH = Pattern.compile(
            "^/api/v1/workspaces/([^/]+)/(?:projects/([^/]+)/work-items(?:/([^/]+)(?:/([^/]+))?)?|my-tasks|work-items/by-ref/[^/]+)$");
    private final WorkItemFacade workItemFacade;
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;

    WorkItemHttpAuthorizationFilter(
            WorkItemFacade workItemFacade, ProjectFacade projectFacade, WorkspaceFacade workspaceFacade) {
        this.workItemFacade = workItemFacade;
        this.projectFacade = projectFacade;
        this.workspaceFacade = workspaceFacade;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var match = PATH.matcher(request.getRequestURI());
        if (!match.matches()) {
            chain.doFilter(request, response);
            return;
        }
        try {
            var actor = (CurrentUser) request.getAttribute(CurrentUser.class.getName());
            UUID workspace = uuid(match.group(1));
            boolean writing = !Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod());
            String deleted = request.getParameter("deleted");
            if (deleted != null && Set.of("true", "on", "yes", "1").contains(deleted.toLowerCase(Locale.ROOT)))
                workspaceFacade.requireAccess(actor, workspace, WorkspaceFacade.Action.WRITE_WORK);
            if (match.group(2) != null) {
                UUID project = uuid(match.group(2));
                projectFacade.requireAccess(actor, workspace, project, writing);
                if (match.group(3) != null
                        && !(match.group(3).equals("counts") && match.group(4) == null && !writing)) {
                    boolean includeDeleted = "restore".equals(match.group(4))
                            || request.getMethod().equals("DELETE");
                    workItemFacade.requireAccess(
                            actor, workspace, project, uuid(match.group(3)), writing, includeDeleted);
                }
            } else workspaceFacade.requireAccess(actor, workspace, WorkspaceFacade.Action.READ);
            chain.doFilter(request, response);
        } catch (BusinessException failure) {
            ProblemResponse.write(response, failure.errorCode());
        }
    }

    private static UUID uuid(String raw) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }
}
