package com.taskflow.dto.ai;

import java.util.UUID;

public record OverdueSuggestionResponse(
    UUID taskId,
    String title,
    String priority,
    String currentDueDate,
    String suggestedDueDate,
    String reason,
    int daysOverdue
) {}
