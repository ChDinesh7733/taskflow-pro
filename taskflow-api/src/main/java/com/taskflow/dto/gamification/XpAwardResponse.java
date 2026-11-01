package com.taskflow.dto.gamification;

import java.util.List;

public record XpAwardResponse(
    int xpGained,
    int newXp,
    int newLevel,
    boolean leveledUp,
    String levelTitle,
    List<BadgeResponse> newlyUnlockedBadges
) {}
