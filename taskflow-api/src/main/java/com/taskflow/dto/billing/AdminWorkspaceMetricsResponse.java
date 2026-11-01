package com.taskflow.dto.billing;

public record AdminWorkspaceMetricsResponse(
        long totalUsers,
        long activeDeliverables,
        long completedTasks,
        long totalTasks,
        long monthlyRecurringRevenue,
        long totalPomodoroMinutes,
        long activeSubscriptionsCount
) {}
