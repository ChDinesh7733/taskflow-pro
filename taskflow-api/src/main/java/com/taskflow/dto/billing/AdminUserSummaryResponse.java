package com.taskflow.dto.billing;

import com.taskflow.entity.User;
import com.taskflow.enums.UserRole;
import java.time.LocalDateTime;
import java.util.UUID;

public record AdminUserSummaryResponse(
        UUID id,
        String email,
        String displayName,
        UserRole role,
        String planTier,
        boolean enabled,
        long taskCount,
        int level,
        int xp,
        int currentStreak,
        LocalDateTime createdAt
) {
    public static AdminUserSummaryResponse from(User user, long taskCount) {
        return new AdminUserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getPlanTier(),
                user.isEnabled(),
                taskCount,
                user.getLevel(),
                user.getXp(),
                user.getCurrentStreak(),
                user.getCreatedAt()
        );
    }
}
