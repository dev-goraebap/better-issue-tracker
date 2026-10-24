package io.github.goraebap.bit.module.label.application;

import io.github.goraebap.bit.module.label.LabelFacade;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class LabelWebConfig {
    @Bean
    FilterRegistrationBean<LabelHttpAuthorizationFilter> labelAuthorization(
            LabelFacade labelFacade, SecurityFilterProperties properties) {
        var registration = new FilterRegistrationBean<>(new LabelHttpAuthorizationFilter(labelFacade));
        registration.setOrder(properties.getOrder() + 4);
        registration.addUrlPatterns("/api/v1/workspaces/*");
        return registration;
    }
}
