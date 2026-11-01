package com.taskflow.dto.integrations;

import com.taskflow.entity.ApiKey;
import java.time.LocalDateTime;
import java.util.UUID;

public record ApiKeyResponse(
    UUID id,
    String name,
    String keyPrefix,
    LocalDateTime createdAt,
    LocalDateTime lastUsedAt
) {
    public static ApiKeyResponse from(ApiKey k) {
        return new ApiKeyResponse(
            k.getId(),
            k.getName(),
            k.getKeyPrefix() + "••••••••••••",
            k.getCreatedAt(),
            k.getLastUsedAt()
        );
    }
}
