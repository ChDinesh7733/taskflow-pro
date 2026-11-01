package com.taskflow.service.impl;

import com.taskflow.dto.pomodoro.LogPomodoroRequest;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.PomodoroSession;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.PomodoroSessionRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.PomodoroService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PomodoroServiceImpl implements PomodoroService {

    private final PomodoroSessionRepository sessionRepo;
    private final UserRepository userRepo;
    private final TaskRepository taskRepo;
    private final ActivityLogRepository logRepo;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    @Override
    @Transactional
    public Map<String, Object> logSession(String userEmail, LogPomodoroRequest req) {
        User user = findUser(userEmail);
        Task task = null;

        if (req.taskId() != null) {
            task = taskRepo.findById(req.taskId())
                .filter(t -> t.getOwner().getId().equals(user.getId()))
                .orElse(null);
        }

        int duration = (req.durationMinutes() != null && req.durationMinutes() > 0) ? req.durationMinutes() : 25;
        String type = (req.sessionType() != null && !req.sessionType().isBlank()) ? req.sessionType() : "WORK";
        boolean interrupted = req.interrupted() != null && req.interrupted();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startedAt = now.minusMinutes(duration);

        PomodoroSession session = PomodoroSession.builder()
            .user(user)
            .task(task)
            .durationMinutes(duration)
            .sessionType(type)
            .interrupted(interrupted)
            .startedAt(startedAt)
            .completedAt(now)
            .build();

        PomodoroSession saved = sessionRepo.save(session);

        // If attached to a task, write an activity log
        if (task != null && !interrupted && "WORK".equalsIgnoreCase(type)) {
            ActivityLog entry = ActivityLog.builder()
                .task(task)
                .actor(user)
                .action("POMODORO_COMPLETED")
                .newValue(duration + " min focus logged")
                .build();
            logRepo.save(entry);
        }

        log.info("Logged {} min Pomodoro ({}) for user {}", duration, type, userEmail);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("sessionId", saved.getId().toString());
        result.put("durationMinutes", duration);
        result.put("sessionType", type);
        result.put("interrupted", interrupted);
        result.put("taskTitle", task != null ? task.getTitle() : null);
        result.put("message", String.format("Logged %d minutes focus session%s", duration, (task != null ? " for '" + task.getTitle() + "'" : "")));
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getStats(String userEmail) {
        User user = findUser(userEmail);
        UUID userId = user.getId();

        int totalMinutes = sessionRepo.sumTotalMinutesByUser(userId);
        long completedSessions = sessionRepo.countCompletedByUser(userId);

        LocalDateTime startOfToday = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        int todayMinutes = sessionRepo.sumMinutesByUserSince(userId, startOfToday);

        // Calculate active daily completion streak
        int streak = calculateStreak(userId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalMinutes", totalMinutes);
        stats.put("completedSessions", completedSessions);
        stats.put("todayMinutes", todayMinutes);
        stats.put("todayHours", String.format(Locale.US, "%.1f", todayMinutes / 60.0));
        stats.put("currentStreak", streak);
        return stats;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecentSessions(String userEmail) {
        User user = findUser(userEmail);
        List<PomodoroSession> list = sessionRepo.findByUserIdOrderByStartedAtDesc(user.getId());

        List<Map<String, Object>> result = new ArrayList<>();
        int limit = Math.min(list.size(), 10);
        for (int i = 0; i < limit; i++) {
            PomodoroSession s = list.get(i);
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId().toString());
            m.put("durationMinutes", s.getDurationMinutes());
            m.put("sessionType", s.getSessionType());
            m.put("interrupted", s.getInterrupted());
            m.put("taskTitle", s.getTask() != null ? s.getTask().getTitle() : null);
            m.put("completedAt", s.getCompletedAt() != null ? s.getCompletedAt().format(TIME_FMT) : null);
            result.add(m);
        }
        return result;
    }

    private int calculateStreak(UUID userId) {
        List<PomodoroSession> sessions = sessionRepo.findByUserIdOrderByStartedAtDesc(userId);
        Set<LocalDate> activeDates = new TreeSet<>(Collections.reverseOrder());

        for (PomodoroSession s : sessions) {
            if (s.getCompletedAt() != null && !Boolean.TRUE.equals(s.getInterrupted())) {
                activeDates.add(s.getCompletedAt().toLocalDate());
            }
        }

        // Also check task completions for streak
        List<Task> tasks = taskRepo.findByOwnerId(userId);
        for (Task t : tasks) {
            if (t.getCompletedAt() != null) {
                activeDates.add(t.getCompletedAt().toLocalDate());
            }
        }

        LocalDate current = LocalDate.now();
        int streak = 0;

        // If active today, count it and look back
        if (activeDates.contains(current)) {
            streak++;
            current = current.minusDays(1);
        } else if (activeDates.contains(current.minusDays(1))) {
            // Did not complete yet today, but completed yesterday -> streak is alive!
            current = current.minusDays(1);
        } else {
            return 0;
        }

        while (activeDates.contains(current)) {
            streak++;
            current = current.minusDays(1);
        }

        return streak;
    }

    private User findUser(String email) {
        return userRepo.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
