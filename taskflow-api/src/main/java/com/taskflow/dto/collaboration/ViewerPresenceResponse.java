package com.taskflow.dto.collaboration;

import java.util.UUID;

public record ViewerPresenceResponse(
    UUID userId,
    String name,
    String email,
    String avatarUrl,
    long lastSeenEpoch
) {}
