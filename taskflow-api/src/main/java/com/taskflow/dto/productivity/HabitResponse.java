package com.taskflow.dto.productivity;

import com.taskflow.entity.Habit;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record HabitResponse(
    UUID id,
    String title,
    String description,
    String frequency,
    int currentStreak,
    int longestStreak,
    LocalDate lastCompletedDate,
    boolean completedToday,
    LocalDateTime createdAt
) {
    public static HabitResponse from(Habit h) {
        boolean doneToday = h.getLastCompletedDate() != null && h.getLastCompletedDate().equals(LocalDate.now());
        return new HabitResponse(
            h.getId(),
            h.getTitle(),
            h.getDescription(),
            h.getFrequency(),
            h.getCurrentStreak(),
            h.getLongestStreak(),
            h.getLastCompletedDate(),
            doneToday,
            h.getCreatedAt()
        );
    }
}
