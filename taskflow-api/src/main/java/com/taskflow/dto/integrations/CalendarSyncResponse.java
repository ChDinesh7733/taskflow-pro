package com.taskflow.dto.integrations;

import java.time.LocalDateTime;

public record CalendarSyncResponse(
    int syncedCount,
    String message,
    LocalDateTime lastSync
) {}
