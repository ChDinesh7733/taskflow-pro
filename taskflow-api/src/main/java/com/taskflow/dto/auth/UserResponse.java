package com.taskflow.dto.auth;

import com.taskflow.entity.User;
import java.time.LocalDateTime;
import java.util.UUID;

/** Safe user representation — never exposes passwordHash. */
public record UserResponse(
    UUID          id,
    String        email,
    String        displayName,
    String        role,
    LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getEmail(),
            user.getDisplayName(),
            user.getRole().name(),
            user.getCreatedAt()
        );
    }
}
