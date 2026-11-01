package com.taskflow.dto.productivity;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record CreateGoalRequest(
    @NotBlank(message = "Goal title is required")
    String title,
    String description,
    LocalDate targetDate
) {}
