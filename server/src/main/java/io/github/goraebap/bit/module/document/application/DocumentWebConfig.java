package io.github.goraebap.bit.module.document.application;

import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class DocumentWebConfig {
    @Bean
    FilterRegistrationBean<DocumentHttpAuthorizationFilter> documentAuthorization(
            WorkspaceFacade workspaceFacade, SecurityFilterProperties properties) {
        var registration = new FilterRegistrationBean<>(new DocumentHttpAuthorizationFilter(workspaceFacade));
        registration.setOrder(properties.getOrder() + 3);
        registration.addUrlPatterns("/api/v1/workspaces/*");
        return registration;
    }
}
