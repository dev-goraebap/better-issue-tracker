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
                if (user.method() == CurrentUser.Method.API_KEY && !path.equals("/api/v1/me") && !publicInfo(request))
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
                    && Set.of("/api/v1/auth/bootstrap", "/api/v1/auth/sessions").contains(request.getRequestURI()))
                attemptLimiter.check(request.getRemoteAddr());
            chain.doFilter(request, response);
        } catch (BusinessException failure) {
            ProblemResponse.write(response, failure.errorCode());
        } finally {
            SecurityContextHolder.clearContext();
        }
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
