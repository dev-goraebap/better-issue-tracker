package io.github.goraebap.bit.module.workspace.application;

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
import java.util.regex.Pattern;
import org.springframework.web.filter.OncePerRequestFilter;

final class WorkspaceHttpAuthorizationFilter extends OncePerRequestFilter {
    private static final Pattern PATH = Pattern.compile("^/api/v1/workspaces/([^/]+)(?:/(.*))?$");
    private final WorkspaceFacade workspaceFacade;

    WorkspaceHttpAuthorizationFilter(WorkspaceFacade workspaceFacade) {
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
            String id;
            try {
                id = Ids.parse(match.group(1));
            } catch (IllegalArgumentException invalid) {
                throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
            }
            String suffix = match.group(2);
            String method = request.getMethod();
            var action = WorkspaceFacade.Action.READ;
            if (suffix == null && method.equals("DELETE") || "owner".equals(suffix))
                action = WorkspaceFacade.Action.OWNER;
            else if (suffix == null && method.equals("PATCH")
                    || "logo".equals(suffix) && (method.equals("PUT") || method.equals("DELETE")))
                action = WorkspaceFacade.Action.EDIT_SETTINGS;
            else if (suffix != null && suffix.startsWith("invitations")
                    || suffix != null && suffix.startsWith("members/") && !suffix.equals("members/me"))
                action = WorkspaceFacade.Action.MANAGE_MEMBERS;
            workspaceFacade.requireAccess((CurrentUser) request.getAttribute(CurrentUser.class.getName()), id, action);
            if (suffix != null && suffix.startsWith("members/") && !suffix.equals("members/me")) {
                workspaceFacade.requireMemberManagement(
                        (CurrentUser) request.getAttribute(CurrentUser.class.getName()), id, resourceId(suffix));
            } else if (suffix != null && suffix.startsWith("invitations/")) {
                workspaceFacade.requireInvitationManagement(
                        (CurrentUser) request.getAttribute(CurrentUser.class.getName()), id, resourceId(suffix));
            }
            chain.doFilter(request, response);
        } catch (BusinessException failure) {
            ProblemResponse.write(response, failure.errorCode());
        }
    }

    private String resourceId(String suffix) {
        try {
            return Ids.parse(suffix.substring(suffix.indexOf('/') + 1));
        } catch (IllegalArgumentException invalid) {
            throw CommonErrorCode.COMMON_INVALID_REQUEST.raise();
        }
    }
}
