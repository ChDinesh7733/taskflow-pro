package com.taskflow.dto.task;

import com.taskflow.enums.TaskPriority;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateTaskRequest(

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    String title,

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    String description,

    TaskPriority priority,        // defaults to MEDIUM when null

    @FutureOrPresent(message = "Start date must be today or in the future")
    LocalDate startDate,

    LocalDate dueDate,

    String tags,

    String assigneeName,

    java.util.UUID categoryId,    // optional

    java.util.UUID goalId,        // optional OKR/Goal

    LocalDate timeBlockDate,      // optional time blocking

    String timeBlockStart,        // e.g. "09:00"

    String timeBlockEnd           // e.g. "10:30"
) {
    public CreateTaskRequest(String title, String description, TaskPriority priority, LocalDate startDate, LocalDate dueDate, java.util.UUID categoryId) {
        this(title, description, priority, startDate, dueDate, null, null, categoryId, null, null, null, null);
    }
}
