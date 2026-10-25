package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.shared.error.BusinessException;
import io.github.goraebap.bit.shared.web.CurrentUser;
import io.github.goraebap.bit.shared.web.ProblemResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

final class AuthenticationFilter extends OncePerRequestFilter {
    private final AuthService authService;
    private final IamService iamService;
    private final AuthCookies authCookies;
    private final AttemptLimiter attemptLimiter;
    private final Set<String> allowedOrigins;

    AuthenticationFilter(
            AuthService authService,
            IamService iamService,
            AuthCookies authCookies,
            AttemptLimiter attemptLimiter,
            String allowedOrigins) {
        this.authService = authService;
        this.iamService = iamService;
        this.authCookies = authCookies;
        this.attemptLimiter = attemptLimiter;
        this.allowedOrigins = Set.copyOf(Arrays.stream(allowedOrigins.split(","))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .toList());
        if (this.allowedOrigins.isEmpty()) throw new IllegalStateException("Allowed origins must not be empty");
    }

    static boolean safe(HttpServletRequest request) {
        return Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod());
    }

    static boolean bearer(HttpServletRequest request) {
        return request.getAttribute(SignedCsrfTokens.PRINCIPAL) instanceof CurrentUser user
                && user.method() == CurrentUser.Method.API_KEY;
    }

    static boolean publicInfo(HttpServletRequest request) {
        return Set.of("GET", "HEAD").contains(request.getMethod())
                && Set.of("/api/v1/health", "/api/v1/capabilities", "/api/v1/auth/bootstrap", "/api/v1/auth/csrf")
                        .contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!request.getRequestURI().startsWith("/api")) {
            chain.doFilter(request, response);
            return;
        }
        try {
            String authorization = request.getHeader("Authorization");
            String token = AuthCookies.read(request, "bit_session");
            CurrentUser user = null;
            if (authorization != null) {
                if (!authorization.startsWith("Bearer ")
                        || java.util.Collections.list(request.getHeaders("Authorization"))
                                        .size()
                                != 1) throw AuthErrorCode.AUTH_UNAUTHENTICATED.raise();
                user = authService
                        .authenticate(authorization.substring(7), CurrentUser.Method.API_KEY)
                        .orElseThrow(AuthErrorCode.AUTH_UNAUTHENTICATED::raise);
            } else if (token != null)
                user = authService
                        .authenticate(token, CurrentUser.Method.SESSION)
                        .orElse(null);
            if (user != null) {
                request.setAttribute(SignedCsrfTokens.PRINCIPAL, user);
                List<SimpleGrantedAuthority> authorities =
                        user.instanceAdmin() ? List.of(new SimpleGrantedAuthority("INSTANCE_ADMIN")) : List.of();
                var context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, authorities));
                SecurityContextHolder.setContext(context);
                String path = request.getRequestURI();
                if (user.method() == CurrentUser.Method.API_KEY && !businessBearer(request) && !publicInfo(request))
                    throw AuthErrorCode.AUTH_FORBIDDEN.raise();
                if (path.equals("/api/v1/invitation-registrations")) throw AuthErrorCode.AUTH_FORBIDDEN.raise();
                // MCP is for agents, each with its own key (D-021, D-081); a browser's session is not one.
                if (path.equals("/api/mcp") && user.method() != CurrentUser.Method.API_KEY)
                    throw AuthErrorCode.AUTH_FORBIDDEN.raise();
                boolean recovery = path.equals("/api/v1/me")
                        || path.equals("/api/v1/auth/csrf")
                        || path.equals("/api/v1/me/password")
                        || path.equals("/api/v1/auth/sessions/current")
                        || (path.equals("/api/v1/auth/sessions")
                                && request.getMethod().equals("DELETE"))
                        || publicInfo(request);
                if (user.mustChangePassword() && !recovery) throw AuthErrorCode.AUTH_FORBIDDEN.raise();
                if (path.startsWith("/api/v1/admin/") && !user.instanceAdmin())
                    throw AuthErrorCode.AUTH_FORBIDDEN.raise();
                if (user.method() == CurrentUser.Method.SESSION) {
                    var session = iamService.currentSession(user);
                    authCookies.session(response, new AuthService.IssuedSession(token, user, session.expiresAt()));
                }
            }
            if (!safe(request) && !bearer(request)) verifyOrigin(request);
            if (request.getMethod().equals("POST")
                    && Set.of(
                                    "/api/v1/auth/bootstrap",
                                    "/api/v1/auth/sessions",
                                    "/api/v1/invitation-previews",
                                    "/api/v1/invitation-registrations")
                            .contains(request.getRequestURI())) attemptLimiter.check(request.getRemoteAddr());
            chain.doFilter(request, response);
        } catch (BusinessException failure) {
            ProblemResponse.write(response, failure.errorCode());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private static boolean businessBearer(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String project = "/api/v1/workspaces/[^/]+/projects";
        if (Set.of("GET", "HEAD").contains(method)
                && path.matches(project + "(?:/[^/]+(?:/(?:columns|work-items)(?:/[^/]+)?)?)?")) return true;
        if (method.equals("POST")
                && (path.matches(project)
                        || path.matches(
                                project
                                        + "/[^/]+/(?:archive|unarchive|restore|columns(?:/reorder)?|work-items(?:/[^/]+/(?:move|archive|unarchive|restore))?)")))
            return true;
        if (Set.of("PATCH", "DELETE").contains(method)
                && path.matches(project + "/[^/]+(?:/(?:columns|work-items)/[^/]+)?")) return true;
        String labels = "/api/v1/workspaces/[^/]+/labels";
        if (Set.of("GET", "HEAD").contains(method) && path.matches(labels + "(?:/[^/]+)?")
                || method.equals("POST") && path.matches(labels)
                || Set.of("PATCH", "DELETE").contains(method) && path.matches(labels + "/[^/]+")) return true;
        String views = "/api/v1/workspaces/[^/]+/views";
        String tweaks = "/api/v1/workspaces/[^/]+/view-tweaks";
        if (Set.of("GET", "HEAD").contains(method) && (path.matches(views + "(?:/[^/]+)?") || path.matches(tweaks))
                || method.equals("POST") && path.matches(views)
                || Set.of("PATCH", "DELETE").contains(method) && path.matches(views + "/[^/]+")
                || Set.of("PUT", "DELETE").contains(method) && path.matches(tweaks + "/[^/]+")) return true;
        if (path.equals("/api/mcp")) return true;
        // An agent reads a target's timeline and comments on it as its owner (D-078).
        String comments = "/api/v1/workspaces/[^/]+/comments";
        if (Set.of("GET", "HEAD").contains(method) && path.matches("/api/v1/workspaces/[^/]+/timeline")
                || method.equals("POST") && path.matches(comments)
                || Set.of("PATCH", "DELETE").contains(method) && path.matches(comments + "/[^/]+")) return true;
        if (Set.of("GET", "HEAD").contains(method))
            return path.equals("/api/v1/me")
                    || path.equals("/api/v1/me/workspaces")
                    || path.matches("/api/v1/workspaces/[^/]+/(?:my-tasks|work-items|work-items/by-ref/[^/]+)")
                    || path.matches("/api/v1/workspaces/[^/]+(?:/members)?");
        return method.equals("PATCH") && path.matches("/api/v1/workspaces/[^/]+");
    }

    private void verifyOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin == null) {
            String referer = request.getHeader("Referer");
            if (referer != null) {
                try {
                    URI uri = URI.create(referer);
                    if (uri.getScheme() != null && uri.getRawAuthority() != null && uri.getRawUserInfo() == null)
                        origin = uri.getScheme() + "://" + uri.getRawAuthority();
                } catch (IllegalArgumentException invalid) {
                    throw AuthErrorCode.AUTH_FORBIDDEN.raise();
                }
            }
        }
        if (!allowedOrigins.contains(origin == null ? "" : origin)) throw AuthErrorCode.AUTH_FORBIDDEN.raise();
    }
}
