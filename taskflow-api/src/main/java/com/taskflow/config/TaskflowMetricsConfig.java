package com.taskflow.config;

import com.taskflow.repository.PomodoroSessionRepository;
import com.taskflow.repository.SubscriptionRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.MeterBinder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TaskflowMetricsConfig {

    @Bean
    public MeterBinder taskflowCustomMetrics(
            UserRepository userRepo,
            TaskRepository taskRepo,
            SubscriptionRepository subRepo,
            PomodoroSessionRepository pomodoroRepo) {

        return (MeterRegistry registry) -> {
            // Gauge: Total registered users
            Gauge.builder("taskflow.users.total", userRepo, UserRepository::count)
                    .description("Total number of registered workspace users")
                    .register(registry);

            // Gauge: Total tasks
            Gauge.builder("taskflow.tasks.total", taskRepo, TaskRepository::count)
                    .description("Total number of tasks across all states")
                    .register(registry);

            // Gauge: Total MRR USD
            Gauge.builder("taskflow.billing.mrr.usd", subRepo, repo -> {
                Long mrr = repo.sumActiveSubscriptionAmounts();
                return mrr != null ? mrr.doubleValue() : 0.0;
            })
            .description("Monthly recurring revenue from active subscriptions in USD")
            .register(registry);

            // Gauge: Total Focus Pomodoro Minutes
            Gauge.builder("taskflow.productivity.pomodoro.minutes", pomodoroRepo, repo -> {
                Long mins = repo.sumAllPomodoroMinutes();
                return mins != null ? mins.doubleValue() : 0.0;
            })
            .description("Total cumulative completed focus minutes logged across the platform")
            .register(registry);
        };
    }
}
