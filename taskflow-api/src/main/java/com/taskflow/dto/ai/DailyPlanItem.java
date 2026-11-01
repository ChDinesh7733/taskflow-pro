package com.taskflow.dto.ai;

import java.util.UUID;

public record DailyPlanItem(
    UUID taskId,
    String title,
    String priority,
    String dueDate,
    String reason,
    String suggestedTimeBlock,
    int estimatedMinutes,
    int orderIndex
) {}
