package io.github.goraebap.bit.shared.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Runs the nightly jobs, such as the file cleanup. app.jobs.enabled=false turns them off, as in tests. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "app.jobs.enabled", havingValue = "true", matchIfMissing = true)
@EnableScheduling
class SchedulingConfig {}
