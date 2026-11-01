package com.taskflow.dto.gamification;

import java.time.LocalDateTime;

public record BadgeResponse(
    String badgeKey,
    String title,
    String description,
    String icon,
    boolean unlocked,
    LocalDateTime unlockedAt
) {}
