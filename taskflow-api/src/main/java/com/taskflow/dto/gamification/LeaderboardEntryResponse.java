package com.taskflow.dto.gamification;

public record LeaderboardEntryResponse(
    int rank,
    String displayName,
    String email,
    int level,
    int weeklyXp,
    long tasksCompleted,
    boolean isCurrent
) {}
