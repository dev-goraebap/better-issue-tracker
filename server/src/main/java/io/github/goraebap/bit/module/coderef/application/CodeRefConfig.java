package io.github.goraebap.bit.module.coderef.application;

import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration(proxyBeanMethods = false)
class CodeRefConfig {
    /**
     * One thread for what goes out to repositories (D-087), so an issue's creation reaches the host before its first
     * change does; a bounded queue so a host that hangs cannot gather memory.
     */
    @Bean(name = "repositorySyncExecutor", destroyMethod = "shutdown")
    Executor repositorySyncExecutor() {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("repository-sync-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        executor.initialize();
        return executor;
    }
}
