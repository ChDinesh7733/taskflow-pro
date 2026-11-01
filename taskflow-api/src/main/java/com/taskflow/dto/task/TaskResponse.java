package com.taskflow.dto.task;

import com.taskflow.entity.Task;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record TaskResponse(
    UUID           id,
    String         title,
    String         description,
    TaskStatus     status,
    TaskPriority   priority,
    LocalDate      startDate,
    LocalDate      dueDate,
    LocalDateTime  completedAt,
    String         tags,
    String         assigneeName,
    UUID           ownerId,
    String         ownerName,
    UUID           categoryId,
    String         categoryName,
    UUID           goalId,
    String         goalTitle,
    LocalDate      timeBlockDate,
    String         timeBlockStart,
    String         timeBlockEnd,
    LocalDateTime  createdAt,
    LocalDateTime  updatedAt,
    long           subtaskCount,
    long           completedSubtaskCount
) {
    public static TaskResponse from(Task t) {
        long subtaskCount = t.getSubtasks() == null ? 0 : t.getSubtasks().size();
        long completedSubtaskCount = t.getSubtasks() == null ? 0 :
            t.getSubtasks().stream().filter(s -> s.isDone()).count();
        return new TaskResponse(
            t.getId(),
            t.getTitle(),
            t.getDescription(),
            t.getStatus(),
            t.getPriority(),
            t.getStartDate(),
            t.getDueDate(),
            t.getCompletedAt(),
            t.getTags(),
            t.getAssigneeName(),
            t.getOwner().getId(),
            t.getOwner().getDisplayName(),
            t.getCategory() != null ? t.getCategory().getId()   : null,
            t.getCategory() != null ? t.getCategory().getName() : null,
            t.getGoal() != null ? t.getGoal().getId() : null,
            t.getGoal() != null ? t.getGoal().getTitle() : null,
            t.getTimeBlockDate(),
            t.getTimeBlockStart(),
            t.getTimeBlockEnd(),
            t.getCreatedAt(),
            t.getUpdatedAt(),
            subtaskCount,
            completedSubtaskCount
        );
    }
}
