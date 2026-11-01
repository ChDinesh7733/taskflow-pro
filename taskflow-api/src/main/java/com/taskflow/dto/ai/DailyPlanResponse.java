package com.taskflow.dto.ai;

import java.util.List;

public record DailyPlanResponse(
    String date,
    String dayTheme,
    int totalTasksPlanned,
    int totalEstimatedMinutes,
    String plannerNote,
    List<DailyPlanItem> plannedTasks
) {}
