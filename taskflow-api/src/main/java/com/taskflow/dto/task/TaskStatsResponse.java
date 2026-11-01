package com.taskflow.dto.task;

public record TaskStatsResponse(
    long  total,
    long  todo,
    long  inProgress,
    long  inReview,
    long  completed,
    long  cancelled,
    double completionRate   // percentage 0–100
) {}
