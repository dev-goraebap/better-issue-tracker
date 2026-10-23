package io.github.goraebap.bit.module.iam.application;

import io.github.goraebap.bit.shared.web.ProblemResponse;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.NullAuthenticatedSessionStrategy;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.StaticHeadersWriter;

@Configuration(proxyBeanMethods = false)
class AuthSecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    SecurityFilterChain apiSecurity(
            HttpSecurity httpSecurity,
            AuthService authService,
            IamService iamService,
            AuthCookies authCookies,
            SignedCsrfTokens signedCsrfTokens,
            AttemptLimiter attemptLimiter,
            @Value("${app.auth.allowed-origins}") String allowedOrigins)
            throws Exception {
        return httpSecurity
                // Database sessions own rotation; restoring a session is not a new login.
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(c -> c.disable())
                .formLogin(c -> c.disable())
                .httpBasic(c -> c.disable())
                .logout(c -> c.disable())
                .addFilterBefore(
                        new AuthenticationFilter(authService, iamService, authCookies, attemptLimiter, allowedOrigins),
                        CsrfFilter.class)
                .csrf(c -> c.csrfTokenRepository(signedCsrfTokens)
                        .sessionAuthenticationStrategy(new NullAuthenticatedSessionStrategy())
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        .requireCsrfProtectionMatcher(request ->
                                !AuthenticationFilter.safe(request) && !AuthenticationFilter.bearer(request)))
                .authorizeHttpRequests(a -> a.dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD)
                        .permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/health",
                                "/api/v1/capabilities",
                                "/api/v1/auth/bootstrap",
                                "/api/v1/auth/csrf")
                        .permitAll()
                        .requestMatchers(
                                HttpMethod.HEAD,
                                "/api/v1/health",
                                "/api/v1/capabilities",
                                "/api/v1/auth/bootstrap",
                                "/api/v1/auth/csrf")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/bootstrap", "/api/v1/auth/sessions")
                        .permitAll()
                        .requestMatchers(
                                "/api/v1/me",
                                "/api/v1/me/password",
                                "/api/v1/me/api-keys",
                                "/api/v1/me/api-keys/*",
                                "/api/v1/auth/sessions",
                                "/api/v1/auth/sessions/current")
                        .authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/users/*/temporary-passwords")
                        .hasAuthority("INSTANCE_ADMIN")
                        .requestMatchers(
                                HttpMethod.POST, "/api/v1/invitation-previews", "/api/v1/invitation-registrations")
                        .permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/me/workspaces",
                                "/api/v1/workspaces/*",
                                "/api/v1/workspaces/*/members",
                                "/api/v1/workspaces/*/invitations",
                                "/api/v1/workspaces/*/invitations/*")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.HEAD,
                                "/api/v1/me/workspaces",
                                "/api/v1/workspaces/*",
                                "/api/v1/workspaces/*/members",
                                "/api/v1/workspaces/*/invitations",
                                "/api/v1/workspaces/*/invitations/*")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/v1/workspaces",
                                "/api/v1/workspaces/*/invitations",
                                "/api/v1/invitation-acceptances")
                        .authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/workspaces/*", "/api/v1/workspaces/*/members/*")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/v1/workspaces/*",
                                "/api/v1/workspaces/*/members/*",
                                "/api/v1/workspaces/*/invitations/*")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.PUT, "/api/v1/workspaces/*/owner", "/api/v1/auth/sessions/current/workspace")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.GET, "/api/v1/workspaces/*/projects", "/api/v1/workspaces/*/projects/**")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.HEAD, "/api/v1/workspaces/*/projects", "/api/v1/workspaces/*/projects/**")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.POST, "/api/v1/workspaces/*/projects", "/api/v1/workspaces/*/projects/**")
                        .authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/workspaces/*/projects/**")
                        .authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/workspaces/*/projects/**")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/workspaces/*/my-tasks",
                                "/api/v1/workspaces/*/work-items/by-ref/*")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.HEAD,
                                "/api/v1/workspaces/*/my-tasks",
                                "/api/v1/workspaces/*/work-items/by-ref/*")
                        .authenticated()
                        .requestMatchers("/api", "/api/**")
                        .denyAll()
                        .requestMatchers(HttpMethod.GET, "/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/**")
                        .permitAll()
                        .anyRequest()
                        .denyAll())
                .exceptionHandling(e -> e.authenticationEntryPoint((request, response, failure) ->
                                ProblemResponse.write(response, AuthErrorCode.AUTH_UNAUTHENTICATED))
                        .accessDeniedHandler((request, response, failure) -> ProblemResponse.write(
                                response,
                                failure instanceof CsrfException
                                        ? AuthErrorCode.AUTH_CSRF_INVALID
                                        : AuthErrorCode.AUTH_FORBIDDEN)))
                .headers(
                        h -> h.addHeaderWriter(
                                        new StaticHeadersWriter("Referrer-Policy", "strict-origin-when-cross-origin"))
                                .addHeaderWriter(
                                        new StaticHeadersWriter(
                                                "Permissions-Policy",
                                                "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()")))
                .build();
    }
}
