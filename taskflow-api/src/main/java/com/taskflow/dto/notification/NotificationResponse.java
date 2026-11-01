package com.taskflow.dto.notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    UUID taskId,
    String type,
    String message,
    boolean read,
    LocalDateTime createdAt
) {}
