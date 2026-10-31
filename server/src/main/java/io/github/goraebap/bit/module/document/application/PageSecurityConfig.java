package io.github.goraebap.bit.module.document.application;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * The bytes under /pages are someone else's HTML and scripts (D-113). This chain, ahead of the API chain, owns their
 * HTTP policy on every response, a 404 and an error dispatch included: the CSP sandbox that keeps a page opened in its
 * own tab from running as BIT, no referrer (the token is in the URL), nosniff, and framing allowed only by BIT. It is
 * public behind the URL's token and never written to.
 */
@Configuration(proxyBeanMethods = false)
class PageSecurityConfig {
    static final String CSP = "sandbox allow-scripts allow-modals; default-src 'self'; "
            + "script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; "
            + "img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; "
            + "connect-src 'none'; form-action 'none'; object-src 'none'; frame-src 'self'; base-uri 'self'; "
            + "frame-ancestors 'self'";

    @Bean
    @Order(1)
    SecurityFilterChain pageSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher(PageSecurityConfig::pages)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())
                .authorizeHttpRequests(requests -> requests.dispatcherTypeMatchers(DispatcherType.ERROR)
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/pages", "/pages/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/pages", "/pages/**")
                        .permitAll()
                        .anyRequest()
                        .denyAll())
                .headers(headers -> headers.frameOptions(frame -> frame.disable())
                        .cacheControl(cache -> cache.disable())
                        .contentSecurityPolicy(csp -> csp.policyDirectives(CSP))
                        .referrerPolicy(
                                referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
                .build();
    }

    /** A request under /pages, or the error dispatch of one, which the servlet container sends to /error. */
    private static boolean pages(HttpServletRequest request) {
        String uri = request.getDispatcherType() == DispatcherType.ERROR
                ? (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI)
                : request.getRequestURI();
        if (uri == null) return false;
        String path = uri.substring(Math.min(request.getContextPath().length(), uri.length()));
        return path.equals("/pages") || path.startsWith("/pages/");
    }
}
