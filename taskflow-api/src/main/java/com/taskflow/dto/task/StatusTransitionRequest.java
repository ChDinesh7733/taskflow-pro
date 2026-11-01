package com.taskflow.dto.task;

import com.taskflow.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record StatusTransitionRequest(
    @NotNull(message = "status is required")
    TaskStatus status
) {}
