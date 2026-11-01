package com.taskflow.dto.task;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record RescheduleTaskRequest(
    @NotNull(message = "New due date is required")
    LocalDate newDueDate,
    String reason
) {}
