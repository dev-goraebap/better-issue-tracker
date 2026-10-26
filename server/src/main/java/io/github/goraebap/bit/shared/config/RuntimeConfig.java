package io.github.goraebap.bit.shared.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class RuntimeConfig {
    /** Every moment it gives is later than the one before, so records written one after another keep their order. */
    @Bean
    Clock clock() {
        return new MonotonicClock(Clock.systemUTC());
    }
}
