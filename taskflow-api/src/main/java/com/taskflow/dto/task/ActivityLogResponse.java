package com.taskflow.dto.task;

import com.taskflow.entity.ActivityLog;
import java.time.LocalDateTime;
import java.util.UUID;

public record ActivityLogResponse(
    UUID id,
    UUID taskId,
    String action,
    String actorLabel,
    String oldValue,
    String newValue,
    LocalDateTime createdAt
) {
    public static ActivityLogResponse from(ActivityLog a) {
        String actor = a.getActor() != null ? a.getActor().getDisplayName() : (a.getActorLabel() != null ? a.getActorLabel() : "System");
        return new ActivityLogResponse(
            a.getId(),
            a.getTask().getId(),
            a.getAction(),
            actor,
            a.getOldValue(),
            a.getNewValue(),
            a.getCreatedAt()
        );
    }
}
