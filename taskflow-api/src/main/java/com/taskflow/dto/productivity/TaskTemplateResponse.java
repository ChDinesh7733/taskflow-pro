package com.taskflow.dto.productivity;

import com.taskflow.entity.TaskTemplate;
import java.time.LocalDateTime;
import java.util.UUID;

public record TaskTemplateResponse(
    UUID id,
    String title,
    String description,
    String category,
    String tasksJson,
    boolean isSystem,
    LocalDateTime createdAt
) {
    public static TaskTemplateResponse from(TaskTemplate t) {
        return new TaskTemplateResponse(
            t.getId(),
            t.getTitle(),
            t.getDescription(),
            t.getCategory(),
            t.getTasksJson(),
            t.getUser() == null,
            t.getCreatedAt()
        );
    }
}
