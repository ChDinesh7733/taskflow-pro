package com.taskflow.dto.productivity;

import jakarta.validation.constraints.NotBlank;

public record CreateHabitRequest(
    @NotBlank(message = "Habit title is required")
    String title,
    String description,
    String frequency
) {}
