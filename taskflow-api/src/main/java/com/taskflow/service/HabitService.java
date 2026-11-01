package com.taskflow.service;

import com.taskflow.dto.productivity.CreateHabitRequest;
import com.taskflow.dto.productivity.HabitResponse;
import com.taskflow.entity.Habit;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.HabitRepository;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HabitService {

    private final HabitRepository habitRepo;
    private final UserRepository userRepo;

    @Transactional(readOnly = true)
    public List<HabitResponse> getHabits(String userEmail) {
        User user = findUser(userEmail);
        return habitRepo.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
            .map(HabitResponse::from)
            .toList();
    }

    @Transactional
    public HabitResponse createHabit(String userEmail, CreateHabitRequest req) {
        User user = findUser(userEmail);
        Habit h = Habit.builder()
            .user(user)
            .title(req.title().trim())
            .description(req.description())
            .frequency(req.frequency() != null ? req.frequency() : "DAILY")
            .currentStreak(0)
            .longestStreak(0)
            .build();

        return HabitResponse.from(habitRepo.save(h));
    }

    @Transactional
    public HabitResponse toggleCheckIn(String userEmail, UUID habitId) {
        User user = findUser(userEmail);
        Habit habit = habitRepo.findById(habitId)
            .filter(h -> h.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Habit", habitId));

        LocalDate today = LocalDate.now();
        LocalDate lastDate = habit.getLastCompletedDate();

        if (lastDate != null && lastDate.equals(today)) {
            // Uncheck today
            habit.setLastCompletedDate(lastDate.minusDays(1)); // roll back date
            habit.setCurrentStreak(Math.max(0, habit.getCurrentStreak() - 1));
            log.info("[Habits] User {} unchecked habit {}", userEmail, habit.getTitle());
        } else {
            // Check in today
            if (lastDate != null && lastDate.equals(today.minusDays(1))) {
                // Streak continued
                habit.setCurrentStreak(habit.getCurrentStreak() + 1);
            } else {
                // First time or streak broken
                habit.setCurrentStreak(1);
            }

            if (habit.getCurrentStreak() > habit.getLongestStreak()) {
                habit.setLongestStreak(habit.getCurrentStreak());
            }
            habit.setLastCompletedDate(today);
            log.info("[Habits] User {} checked in habit {} (streak: {})",
                userEmail, habit.getTitle(), habit.getCurrentStreak());
        }

        return HabitResponse.from(habitRepo.save(habit));
    }

    @Transactional
    public void deleteHabit(String userEmail, UUID habitId) {
        User user = findUser(userEmail);
        Habit habit = habitRepo.findById(habitId)
            .filter(h -> h.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Habit", habitId));

        habitRepo.delete(habit);
    }

    private User findUser(String email) {
        return userRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
}
