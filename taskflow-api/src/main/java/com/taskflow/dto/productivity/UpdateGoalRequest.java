package com.taskflow.dto.productivity;

import java.time.LocalDate;

public record UpdateGoalRequest(
    String title,
    String description,
    LocalDate targetDate,
    Integer progress,
    String status
) {}
