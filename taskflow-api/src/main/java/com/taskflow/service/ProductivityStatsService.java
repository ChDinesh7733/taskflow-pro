package com.taskflow.service;

import com.taskflow.dto.stats.ProductivityStatsResponse;
import com.taskflow.entity.User;
import com.taskflow.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProductivityStatsService {

    private final TaskRepository taskRepository;

    public ProductivityStatsResponse getStats(User user) {
        LocalDate today = LocalDate.now();

        // Completed this week (Mon–Sun)
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        long completedThisWeek = taskRepository.countCompletedSince(
            user.getId(), weekStart.atStartOfDay());

        // Total completed ever
        long totalCompleted = taskRepository.countCompletedSince(
            user.getId(), LocalDateTime.of(2000, 1, 1, 0, 0));

        // On-time rate
        long onTime  = taskRepository.countCompletedOnTime(user.getId());
        double onTimeRate = totalCompleted == 0 ? 0.0 : (double) onTime / totalCompleted;

        // Overdue count
        long overdue = taskRepository.countOverdue(user.getId(), today);

        // Streak (consecutive days with at least 1 completion, ending today)
        List<LocalDate> dates = taskRepository.findCompletionDates(
            user.getId(), LocalDateTime.now().minusDays(30));
        int streak = calculateStreak(dates, today);

        return new ProductivityStatsResponse(onTimeRate, overdue, streak, completedThisWeek, totalCompleted);
    }

    private int calculateStreak(List<LocalDate> dates, LocalDate today) {
        Set<LocalDate> completionDays = new HashSet<>(dates);
        int streak = 0;
        LocalDate cursor = today;
        while (completionDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }
}
