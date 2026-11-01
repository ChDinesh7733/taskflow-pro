package com.taskflow.dto.collaboration;

import com.taskflow.entity.ActivityLog;
import java.time.LocalDateTime;
import java.util.UUID;

public record AuditActivityResponse(
    UUID id,
    UUID taskId,
    String taskTitle,
    String actorName,
    String actorEmail,
    String action,
    String oldValue,
    String newValue,
    LocalDateTime createdAt
) {
    public static AuditActivityResponse from(ActivityLog log) {
        String actorName = log.getActor() != null ? log.getActor().getDisplayName() : (log.getActorLabel() != null ? log.getActorLabel() : "System");
        String actorEmail = log.getActor() != null ? log.getActor().getEmail() : "system@taskflow.local";
        String taskTitle = log.getTask() != null ? log.getTask().getTitle() : "Task";
        UUID taskId = log.getTask() != null ? log.getTask().getId() : null;

        return new AuditActivityResponse(
            log.getId(),
            taskId,
            taskTitle,
            actorName,
            actorEmail,
            log.getAction(),
            log.getOldValue(),
            log.getNewValue(),
            log.getCreatedAt()
        );
    }
}
