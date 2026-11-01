package com.taskflow.service;

import com.taskflow.dto.notification.NotificationResponse;
import com.taskflow.entity.Notification;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.NotificationRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final TaskRepository         taskRepository;
    private final UserRepository         userRepository;

    // ── Public API ──────────────────────────────────────────

    public List<NotificationResponse> getNotifications(User user) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream().map(this::toResponse).toList();
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByUserIdAndReadFalse(user.getId());
    }

    @Transactional
    public NotificationResponse markRead(UUID notifId, User user) {
        Notification n = notificationRepository.findById(notifId)
            .filter(x -> x.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Notification", notifId));
        n.setRead(true);
        return toResponse(notificationRepository.save(n));
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllReadByUserId(user.getId());
    }

    @Transactional
    public NotificationResponse sendNotification(User user, UUID taskId, String type, String message) {
        Notification notification = Notification.builder()
                .user(user)
                .taskId(taskId)
                .type(type)
                .message(message)
                .read(false)
                .build();
        Notification saved = notificationRepository.save(notification);
        return toResponse(saved);
    }

    // ── Scheduled: every hour ───────────────────────────────
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void generateNotifications() {
        LocalDate today    = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        LocalDateTime since24h = LocalDateTime.now().minusHours(24);

        // Tasks due within 24 hours (not yet done)
        List<Task> dueSoon = taskRepository.findDueSoonTasks(today, tomorrow);
        for (Task task : dueSoon) {
            UUID taskId = task.getId();
            User owner  = task.getOwner();
            if (!notificationRepository.existsRecentForTask(taskId, "DUE_SOON", since24h)) {
                createNotification(owner, taskId, "DUE_SOON",
                    "Task \"" + task.getTitle() + "\" is due " +
                    (task.getDueDate().equals(today) ? "today" : "tomorrow") + "!");
            }
        }

        // Overdue tasks (dueDate < today, not done)
        List<Task> overdue = taskRepository.findOverdueTasks(today);
        for (Task task : overdue) {
            UUID taskId = task.getId();
            User owner  = task.getOwner();
            if (!notificationRepository.existsRecentForTask(taskId, "OVERDUE", since24h)) {
                createNotification(owner, taskId, "OVERDUE",
                    "Task \"" + task.getTitle() + "\" is overdue since " + task.getDueDate() + "!");
            }
        }

        log.info("[Notifications] Generated for {} due-soon and {} overdue tasks",
                 dueSoon.size(), overdue.size());
    }

    // ── Internal helper ─────────────────────────────────────

    public void createNotification(User user, UUID taskId, String type, String message) {
        Notification n = Notification.builder()
            .user(user)
            .taskId(taskId)
            .type(type)
            .message(message)
            .build();
        notificationRepository.save(n);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
            n.getId(), n.getTaskId(), n.getType(), n.getMessage(), n.isRead(), n.getCreatedAt()
        );
    }
}
