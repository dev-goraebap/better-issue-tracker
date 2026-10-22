package io.github.goraebap.bit.shared.config;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import io.github.goraebap.bit.shared.web.ProblemResponse;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
class SecurityConfig {
    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity httpSecurity) throws Exception {
        // The API is closed until authentication is implemented. Static SPA reads stay public.
        return httpSecurity
                .authorizeHttpRequests(
                        requests -> requests.dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD)
                                .permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/v1/health", "/api/v1/capabilities")
                                .permitAll()
                                .requestMatchers("/api", "/api/**")
                                .denyAll()
                                .requestMatchers(HttpMethod.GET, "/**")
                                .permitAll()
                                .requestMatchers(HttpMethod.HEAD, "/**")
                                .permitAll()
                                .anyRequest()
                                .denyAll())
                .sessionManagement(sessions -> sessions.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, exception) ->
                                ProblemResponse.write(response, CommonErrorCode.AUTH_UNAUTHENTICATED))
                        .accessDeniedHandler((request, response, exception) ->
                                ProblemResponse.write(response, CommonErrorCode.AUTH_FORBIDDEN)))
                .build();
    }
}
