package io.github.goraebap.bit.module.workspace.application;

import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class WorkspaceWebConfig {
    @Bean
    FilterRegistrationBean<WorkspaceHttpAuthorizationFilter> workspaceAuthorization(
            WorkspaceFacade facade, SecurityFilterProperties properties) {
        var registration = new FilterRegistrationBean<>(new WorkspaceHttpAuthorizationFilter(facade));
        registration.setOrder(properties.getOrder() + 1);
        registration.addUrlPatterns("/api/v1/workspaces/*");
        return registration;
    }
}
