package io.github.goraebap.bit.module.issue.application;

import io.github.goraebap.bit.module.issue.IssueFacade;
import io.github.goraebap.bit.module.project.ProjectFacade;
import io.github.goraebap.bit.module.workspace.WorkspaceFacade;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class IssueWebConfig {
    @Bean
    FilterRegistrationBean<IssueHttpAuthorizationFilter> issueAuthorization(
            IssueFacade issueFacade,
            ProjectFacade projectFacade,
            WorkspaceFacade workspaceFacade,
            SecurityFilterProperties properties) {
        var registration = new FilterRegistrationBean<>(
                new IssueHttpAuthorizationFilter(issueFacade, projectFacade, workspaceFacade));
        registration.setOrder(properties.getOrder() + 3);
        registration.addUrlPatterns("/api/v1/workspaces/*");
        return registration;
    }
}
