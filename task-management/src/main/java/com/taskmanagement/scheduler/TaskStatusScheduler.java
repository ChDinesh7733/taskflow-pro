package com.taskmanagement.scheduler;

import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler that handles automatic task status transitions.
 *
 * Runs every 30 seconds on the Spring scheduler thread pool:
 *
 *   1. PENDING     → IN_PROGRESS  when scheduledStartTime      <= now
 *   2. IN_PROGRESS → COMPLETED    when scheduledCompletionTime <= now
 *
 * Design decisions:
 * - @Async is intentionally NOT used here. Combining @Async + @Transactional
 *   across thread boundaries can cause transaction propagation issues.
 *   The scheduler runs on a dedicated single thread — no concurrency needed.
 * - @Transactional ensures both read and batch-write are in one transaction.
 * - saveAll() is used for batch efficiency.
 * - Repeated execution is idempotent — tasks already transitioned are not re-processed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TaskStatusScheduler {

    private final TaskRepository taskRepository;

    /**
     * Main scheduler — runs every 30 seconds.
     * Handles both PENDING→IN_PROGRESS and IN_PROGRESS→COMPLETED transitions.
     *
     * IDEMPOTENT: Safe to run multiple times — already-transitioned tasks
     * are excluded by their current status + time conditions.
     */
    @Scheduled(fixedRate = 30_000)
    @Transactional
    public void autoTransitionTasks() {
        LocalDateTime now = LocalDateTime.now();
        log.debug("[Scheduler] Running transition check at {}", now);

        int started   = transitionPendingToInProgress(now);
        int completed = transitionInProgressToCompleted(now);

        if (started > 0 || completed > 0) {
            log.info("[Scheduler] Transitioned {} PENDING→IN_PROGRESS, {} IN_PROGRESS→COMPLETED",
                    started, completed);
        }
    }

    // ── PENDING → IN_PROGRESS ────────────────────────────────────────────────

    private int transitionPendingToInProgress(LocalDateTime now) {
        List<Task> eligible = taskRepository.findTasksEligibleForTransition(
                TaskStatus.PENDING, now
        );

        if (eligible.isEmpty()) {
            log.debug("[Scheduler] No PENDING tasks eligible for start.");
            return 0;
        }

        eligible.forEach(task -> {
            task.setStatus(TaskStatus.IN_PROGRESS);
            log.info("[Scheduler] Task '{}' (ID:{}) → IN_PROGRESS", task.getTitle(), task.getId());
        });

        taskRepository.saveAll(eligible);
        return eligible.size();
    }

    // ── IN_PROGRESS → COMPLETED ──────────────────────────────────────────────

    private int transitionInProgressToCompleted(LocalDateTime now) {
        List<Task> eligible = taskRepository.findTasksEligibleForCompletion(
                TaskStatus.IN_PROGRESS, now
        );

        if (eligible.isEmpty()) {
            log.debug("[Scheduler] No IN_PROGRESS tasks eligible for completion.");
            return 0;
        }

        eligible.forEach(task -> {
            task.setStatus(TaskStatus.COMPLETED);
            log.info("[Scheduler] Task '{}' (ID:{}) → COMPLETED", task.getTitle(), task.getId());
        });

        taskRepository.saveAll(eligible);
        return eligible.size();
    }
}
