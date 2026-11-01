package com.taskflow.dto.stats;

public record ProductivityStatsResponse(
    double onTimeCompletionRate,   // 0.0 – 1.0
    long   overdueCount,
    int    currentStreakDays,
    long   completedThisWeek,
    long   totalCompleted
) {}
