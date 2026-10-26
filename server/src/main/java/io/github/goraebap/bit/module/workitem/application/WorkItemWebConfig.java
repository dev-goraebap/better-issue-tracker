package io.github.goraebap.bit.module.workitem.application;

import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workitem.WorkItemFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class WorkItemWebConfig {
    @Bean
    FilterRegistrationBean<WorkItemHttpAuthorizationFilter> workItemAuthorization(
            WorkItemFacade workItemFacade,
            ProjectFacade projectFacade,
            WorkspaceFacade workspaceFacade,
            SecurityFilterProperties properties) {
        var registration = new FilterRegistrationBean<>(
                new WorkItemHttpAuthorizationFilter(workItemFacade, projectFacade, workspaceFacade));
        registration.setOrder(properties.getOrder() + 3);
        registration.addUrlPatterns("/api/v1/workspaces/*");
        return registration;
    }
}
