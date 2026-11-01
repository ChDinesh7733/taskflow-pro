package com.taskflow.dto.integrations;

import java.time.LocalDateTime;
import java.util.UUID;

public record CreatedApiKeyResponse(
    UUID id,
    String name,
    String rawApiKey,
    LocalDateTime createdAt
) {}
