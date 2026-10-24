package io.github.goraebap.bit.module.view.application;

import io.github.goraebap.bit.module.view.ViewFacade;
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
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Checks that the named view exists for the caller, and for view writes that the caller may change it, before the body
 * is read. Creating a view depends on the body (shared or personal), so the service checks that role itself.
 */
final class ViewHttpAuthorizationFilter extends OncePerRequestFilter {
    private static final Pattern PATH = Pattern.compile("^/api/v1/workspaces/([^/]+)/(views|view-tweaks)/([^/]+)$");
    private final ViewFacade viewFacade;

    ViewHttpAuthorizationFilter(ViewFacade viewFacade) {
        this.viewFacade = viewFacade;
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
            boolean writing = !Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod());
            UUID workspace = uuid(match.group(1));
            boolean view = match.group(2).equals("views");
            // Only tweaks may name the built-in view; /views/{id} needs a stored view's id.
            if (view && !isUuid(match.group(3))) throw ViewErrorCode.VIEW_NOT_FOUND.raise();
            viewFacade.requireAccess(actor, workspace, match.group(3), view && writing);
            chain.doFilter(request, response);
        } catch (BusinessException failure) {
            ProblemResponse.write(response, failure.errorCode());
        }
    }

    private static boolean isUuid(String raw) {
        try {
            UUID.fromString(raw);
            return true;
        } catch (IllegalArgumentException invalid) {
            return false;
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
