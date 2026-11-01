package com.taskflow.dto.ai;

import java.util.List;

public record WeeklySummaryResponse(
    String weekRange,
    int completedCount,
    int slippedCount,
    int inProgressCount,
    int focusMinutes,
    int productivityScore,
    List<String> whatIFinished,
    List<String> whatSlipped,
    List<String> whatToFocusOnNext,
    String executiveSummary,
    String generatedAt,
    boolean emailSent,
    String message
) {}
