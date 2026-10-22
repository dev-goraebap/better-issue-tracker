package io.github.goraebap.bit.shared.web;

import io.github.goraebap.bit.shared.error.CommonErrorCode;
import org.apache.catalina.Lifecycle;
import org.apache.catalina.Valve;
import org.apache.catalina.core.StandardHost;
import org.apache.catalina.valves.ErrorReportValve;
import org.springframework.boot.tomcat.TomcatContextCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.firewall.RequestRejectedHandler;

/**
 * Problems for the errors answered before Spring MVC chooses a handler, so that every API error carries a code and a
 * trace id (error contract): URLs the security firewall rejects (//, ;, ..) and what Tomcat refuses on its own (an
 * encoded slash or broken percent-encoding in the path). The error page itself is ProblemErrorController.
 */
@Configuration(proxyBeanMethods = false)
class ProblemErrorConfig {
    /** Spring Security uses this bean for every request its firewall turns away. */
    @Bean
    RequestRejectedHandler requestRejectedHandler() {
        return (request, response, requestRejectedException) ->
                ProblemResponse.write(response, CommonErrorCode.COMMON_INVALID_REQUEST);
    }

    /**
     * Replaces the host's error report with ProblemErrorReportValve. Spring Boot adds its own ErrorReportValve to the
     * host while the context is prepared, so the swap waits for the host to start, after every customizer has run.
     */
    @Bean
    TomcatContextCustomizer problemErrorReport() {
        return context -> {
            StandardHost host = (StandardHost) context.getParent();
            host.setErrorReportValveClass(ProblemErrorReportValve.class.getName());
            host.addLifecycleListener(event -> {
                if (!Lifecycle.BEFORE_START_EVENT.equals(event.getType())) return;
                for (Valve valve : host.getPipeline().getValves()) {
                    if (valve instanceof ErrorReportValve && !(valve instanceof ProblemErrorReportValve))
                        host.getPipeline().removeValve(valve);
                }
            });
        };
    }
}
