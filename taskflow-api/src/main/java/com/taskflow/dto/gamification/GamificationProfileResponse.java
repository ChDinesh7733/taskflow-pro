package com.taskflow.dto.gamification;

import java.util.List;

public record GamificationProfileResponse(
    int xp,
    int level,
    String levelTitle,
    int currentLevelMinXp,
    int nextLevelXp,
    int xpToNextLevel,
    int currentStreak,
    int longestStreak,
    long totalTasksCompleted,
    List<BadgeResponse> badges,
    List<LeaderboardEntryResponse> leaderboard
) {}
