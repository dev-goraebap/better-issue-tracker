package io.github.goraebap.bit.module.view.application;

import io.github.goraebap.bit.module.view.ViewFacade;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class ViewWebConfig {
    @Bean
    FilterRegistrationBean<ViewHttpAuthorizationFilter> viewAuthorization(
            ViewFacade viewFacade, SecurityFilterProperties properties) {
        var registration = new FilterRegistrationBean<>(new ViewHttpAuthorizationFilter(viewFacade));
        registration.setOrder(properties.getOrder() + 5);
        registration.addUrlPatterns("/api/v1/workspaces/*");
        return registration;
    }
}
