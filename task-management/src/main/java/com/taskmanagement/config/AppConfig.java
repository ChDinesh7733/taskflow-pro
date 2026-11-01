package com.taskmanagement.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Application configuration:
 * - Async thread pool for background tasks
 *
 * NOTE: CORS is configured once, centrally, as a CorsConfigurationSource bean
 *       inside {@link com.taskmanagement.security.SecurityConfig}, so the
 *       Spring Security CorsFilter is the only component applying CORS headers.
 */
@Configuration
public class AppConfig {

    /**
     * Custom thread pool for @Async tasks.
     * Separate from the scheduler thread pool to avoid contention.
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("AsyncTask-");
        executor.initialize();
        return executor;
    }
}
