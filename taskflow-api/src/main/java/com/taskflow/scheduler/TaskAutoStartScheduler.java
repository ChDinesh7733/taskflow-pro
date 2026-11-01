package com.taskflow.scheduler;

import com.taskflow.dto.task.TaskResponse;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.Task;
import com.taskflow.enums.TaskStatus;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.service.TaskEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Every minute: promote TODO tasks whose startDate ≤ today to IN_PROGRESS.
 * Idempotent — already IN_PROGRESS tasks are skipped by the query.
 * Writes ActivityLog with actorLabel = "SYSTEM".
 * Publishes WebSocket event to task owner.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TaskAutoStartScheduler {

    private final TaskRepository        taskRepo;
    private final ActivityLogRepository logRepo;
    private final TaskEventPublisher    eventPublisher;

    @Scheduled(fixedDelay = 60_000)   // every 60 s
    @Transactional
    public void autoStartDueTasks() {
        LocalDate today = LocalDate.now();
        List<Task> due  = taskRepo.findPendingTasksDue(TaskStatus.TODO, today);

        if (due.isEmpty()) {
            log.debug("[Scheduler] No TODO tasks to auto-start.");
            return;
        }

        for (Task task : due) {
            task.setStatus(TaskStatus.IN_PROGRESS);

            ActivityLog entry = ActivityLog.builder()
                .task(task)
                .actor(null)
                .actorLabel("SYSTEM")
                .action("STATUS_CHANGED")
                .oldValue(TaskStatus.TODO.name())
                .newValue(TaskStatus.IN_PROGRESS.name())
                .build();
            logRepo.save(entry);
        }

        taskRepo.saveAll(due);
        log.info("[Scheduler] Auto-started {} task(s) (startDate ≤ {}).", due.size(), today);

        // Push WS events to each task owner
        for (Task task : due) {
            try {
                String ownerEmail = task.getOwner().getEmail();
                eventPublisher.publishStatusChanged(ownerEmail, TaskResponse.from(task));
            } catch (Exception e) {
                log.warn("[Scheduler] WS publish failed for task {}: {}", task.getId(), e.getMessage());
            }
        }
    }
}
