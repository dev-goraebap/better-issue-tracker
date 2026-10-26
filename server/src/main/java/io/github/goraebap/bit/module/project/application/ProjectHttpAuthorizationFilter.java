package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import io.github.goraebap.bit.shared.domain.Ids;
import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.ProblemResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.web.filter.OncePerRequestFilter;

final class ProjectHttpAuthorizationFilter extends OncePerRequestFilter {
    private static final Pattern PATH = Pattern.compile("^/api/v1/workspaces/([^/]+)/projects(?:/([^/]+)(?:/(.*))?)?$");
    private final ProjectFacade projectFacade;
    private final WorkspaceFacade workspaceFacade;

    ProjectHttpAuthorizationFilter(ProjectFacade projectFacade, WorkspaceFacade workspaceFacade) {
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
            String workspace = id(match.group(1));
            String method = request.getMethod();
            boolean writing = !Set.of("GET", "HEAD", "OPTIONS").contains(method);
            String projectId = match.group(2);
            String suffix = match.group(3);
            if (projectId == null) {
                workspaceFacade.requireAccess(
                        actor,
                        workspace,
                        writing || "deleted".equals(request.getParameter("status"))
                                ? WorkspaceFacade.Action.EDIT_SETTINGS
                                : WorkspaceFacade.Action.READ);
            } else {
                String project = id(projectId);
                boolean work = suffix != null && suffix.startsWith("work-items");
                if (writing && !work) {
                    boolean deletion = method.equals("DELETE") && suffix == null || "restore".equals(suffix);
                    boolean allowArchived = deletion || "archive".equals(suffix) || "unarchive".equals(suffix);
                    projectFacade.requireSettings(actor, workspace, project, deletion, allowArchived);
                } else projectFacade.requireAccess(actor, workspace, project, writing);
                if (suffix != null && suffix.startsWith("columns/") && !suffix.equals("columns/reorder"))
                    projectFacade.requireColumn(actor, workspace, project, id(suffix.substring("columns/".length())));
            }
            chain.doFilter(request, response);
        } catch (BusinessException failure) {
            ProblemResponse.write(response, failure.errorCode());
        }
    }

    private static String id(String raw) {
        try {
            return Ids.parse(raw);
        } catch (IllegalArgumentException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }
}
