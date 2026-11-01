package com.taskflow.dto.task;

import com.taskflow.enums.TaskPriority;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateTaskRequest(

    @Size(max = 255, message = "Title must not exceed 255 characters")
    String title,

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    String description,

    TaskPriority priority,

    LocalDate startDate,
    LocalDate dueDate,

    String tags,
    String assigneeName,

    java.util.UUID categoryId,
    java.util.UUID goalId,
    LocalDate timeBlockDate,
    String timeBlockStart,
    String timeBlockEnd
) {
    public UpdateTaskRequest(String title, String description, TaskPriority priority, LocalDate startDate, LocalDate dueDate, java.util.UUID categoryId) {
        this(title, description, priority, startDate, dueDate, null, null, categoryId, null, null, null, null);
    }
}
