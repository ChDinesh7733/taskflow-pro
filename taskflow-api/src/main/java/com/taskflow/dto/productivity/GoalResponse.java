package com.taskflow.dto.productivity;

import com.taskflow.entity.Goal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record GoalResponse(
    UUID id,
    String title,
    String description,
    LocalDate targetDate,
    int progress,
    String status,
    long totalTasks,
    long completedTasks,
    LocalDateTime createdAt
) {
    public static GoalResponse from(Goal g, long totalTasks, long completedTasks) {
        int computedProgress = totalTasks > 0 ? (int) Math.round((completedTasks * 100.0) / totalTasks) : g.getProgress();
        return new GoalResponse(
            g.getId(),
            g.getTitle(),
            g.getDescription(),
            g.getTargetDate(),
            computedProgress,
            g.getStatus(),
            totalTasks,
            completedTasks,
            g.getCreatedAt()
        );
    }
}
