package com.stylebook.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Bounded thread pool for {@code @Async} work — currently push notifications and email.
 *
 * <p>Without this, Spring falls back to {@code SimpleAsyncTaskExecutor}, which spawns a
 * brand new thread for every single call and never reuses one. On a small Railway
 * container a burst of bookings would be enough to exhaust memory.
 *
 * <p>{@link ThreadPoolExecutor.CallerRunsPolicy} is the deliberate choice for overflow:
 * if the queue backs up, the calling thread does the work itself. That slows the request
 * down but never silently drops someone's notification.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("stylebook-async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());

        // Let in-flight pushes finish when Railway redeploys and sends SIGTERM.
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);

        executor.initialize();
        return executor;
    }
}
