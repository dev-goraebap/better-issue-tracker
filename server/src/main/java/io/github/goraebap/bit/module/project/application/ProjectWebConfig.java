package io.github.goraebap.bit.module.project.application;

import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class ProjectWebConfig {
    @Bean
    FilterRegistrationBean<ProjectHttpAuthorizationFilter> projectAuthorization(
            ProjectFacade projectFacade, WorkspaceFacade workspaceFacade, SecurityFilterProperties properties) {
        var registration =
                new FilterRegistrationBean<>(new ProjectHttpAuthorizationFilter(projectFacade, workspaceFacade));
        registration.setOrder(properties.getOrder() + 2);
        registration.addUrlPatterns("/api/v1/workspaces/*");
        return registration;
    }
}
