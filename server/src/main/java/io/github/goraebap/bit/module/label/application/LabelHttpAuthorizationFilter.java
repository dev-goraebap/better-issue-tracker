package io.github.goraebap.bit.module.label.application;

import io.github.goraebap.bit.module.label.LabelFacade;
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

/** Checks role and label existence before the body is read, so outsiders learn nothing from validation errors. */
final class LabelHttpAuthorizationFilter extends OncePerRequestFilter {
    private static final Pattern PATH = Pattern.compile("^/api/v1/workspaces/([^/]+)/labels(?:/([^/]+))?$");
    private final LabelFacade labelFacade;

    LabelHttpAuthorizationFilter(LabelFacade labelFacade) {
        this.labelFacade = labelFacade;
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
            labelFacade.requireAccess(
                    actor, id(match.group(1)), match.group(2) == null ? null : id(match.group(2)), writing);
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
