package com.taskflow.service;

import com.taskflow.dto.ai.DuplicateCheckRequest;
import com.taskflow.dto.ai.DuplicateCheckResponse;
import com.taskflow.dto.ai.OverdueSuggestionResponse;
import com.taskflow.dto.task.RescheduleTaskRequest;
import com.taskflow.dto.task.TaskResponse;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiTaskIntelligenceService {

    private final TaskRepository taskRepository;
    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    private static final Set<String> STOPWORDS = Set.of(
        "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
        "at", "by", "for", "with", "about", "against", "between", "into", "through",
        "during", "before", "after", "above", "below", "to", "from", "up", "down",
        "in", "out", "on", "off", "over", "under", "again", "further", "once",
        "here", "there", "all", "any", "both", "each", "few", "more", "most", "other",
        "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
        "very", "s", "t", "can", "will", "just", "don", "should", "now"
    );

    /**
     * Check if a proposed new task is a duplicate or very similar to an existing task
     */
    @Transactional(readOnly = true)
    public DuplicateCheckResponse checkDuplicate(User user, DuplicateCheckRequest req) {
        String inputTitle = req.title().trim();
        if (inputTitle.length() < 3) {
            return new DuplicateCheckResponse(false, 0.0, null, null, null, null);
        }

        List<Task> activeTasks = taskRepository.findUpcomingTasks(user.getId());
        if (activeTasks.isEmpty()) {
            return new DuplicateCheckResponse(false, 0.0, null, null, null, null);
        }

        double maxScore = 0.0;
        Task bestMatch = null;

        for (Task t : activeTasks) {
            double score = calculateSimilarity(inputTitle, t.getTitle());
            if (score > maxScore) {
                maxScore = score;
                bestMatch = t;
            }
        }

        if (maxScore >= 0.55 && bestMatch != null) {
            String warning = String.format(
                "Similar task already exists: \"%s\" (Status: %s, Priority: %s).",
                bestMatch.getTitle(),
                bestMatch.getStatus().name().replace('_', ' '),
                bestMatch.getPriority().name()
            );

            log.info("[DuplicateDetection] Flagged match (score: {}): \"{}\" ~ \"{}\"",
                String.format("%.2f", maxScore), inputTitle, bestMatch.getTitle());

            return new DuplicateCheckResponse(
                true,
                Math.round(maxScore * 100.0) / 100.0,
                bestMatch.getId(),
                bestMatch.getTitle(),
                bestMatch.getStatus().name(),
                warning
            );
        }

        return new DuplicateCheckResponse(false, Math.round(maxScore * 100.0) / 100.0, null, null, null, null);
    }

    /**
     * Detect overdue tasks and generate smart suggested deadlines
     */
    @Transactional(readOnly = true)
    public List<OverdueSuggestionResponse> getOverdueSuggestions(User user) {
        LocalDate today = LocalDate.now();
        List<Task> overdueTasks = taskRepository.findOverdueTasks(today).stream()
            .filter(t -> t.getOwner().getId().equals(user.getId()))
            .sorted(Comparator.comparing(Task::getDueDate))
            .toList();

        List<OverdueSuggestionResponse> suggestions = new ArrayList<>();

        for (Task t : overdueTasks) {
            int daysOverdue = (int) ChronoUnit.DAYS.between(t.getDueDate(), today);

            // Compute smart adjusted due date based on priority
            LocalDate suggestedDate;
            String reason;

            if (t.getPriority() == TaskPriority.URGENT) {
                suggestedDate = today.plusDays(1);
                reason = String.format("Urgent blocker (%d days overdue). Rescheduled to tomorrow to clear sprint pipeline immediately.", daysOverdue);
            } else if (t.getPriority() == TaskPriority.HIGH) {
                suggestedDate = today.plusDays(3);
                reason = String.format("High priority milestone (%d days overdue). Pushed by 3 days to provide dedicated execution bandwidth.", daysOverdue);
            } else if (t.getPriority() == TaskPriority.MEDIUM) {
                suggestedDate = today.plusDays(5);
                reason = String.format("Overdue by %d days. Rescheduled by 5 days to balance against urgent deliverables.", daysOverdue);
            } else {
                suggestedDate = today.plusDays(7);
                reason = String.format("Low priority item (%d days overdue). Pushed to next week's sprint.", daysOverdue);
            }

            suggestions.add(new OverdueSuggestionResponse(
                t.getId(),
                t.getTitle(),
                t.getPriority().name(),
                t.getDueDate().toString(),
                suggestedDate.toString(),
                reason,
                daysOverdue
            ));
        }

        return suggestions;
    }

    /**
     * Reschedule an overdue task to a new recommended due date
     */
    @Transactional
    public TaskResponse rescheduleTask(String userEmail, UUID taskId, RescheduleTaskRequest req) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        return rescheduleTask(user, taskId, req);
    }

    /**
     * Reschedule an overdue task to a new recommended due date
     */
    @Transactional
    public TaskResponse rescheduleTask(User user, UUID taskId, RescheduleTaskRequest req) {
        Task task = taskRepository.findById(taskId)
            .filter(t -> t.getOwner().getId().equals(user.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));

        LocalDate oldDueDate = task.getDueDate();
        task.setDueDate(req.newDueDate());
        Task saved = taskRepository.save(task);

        String note = String.format("AI Rescheduled due date: %s → %s%s",
            oldDueDate != null ? oldDueDate.toString() : "None",
            req.newDueDate().toString(),
            req.reason() != null ? " (Reason: " + req.reason() + ")" : "");

        activityLogRepository.save(ActivityLog.builder()
            .task(saved)
            .actor(user)
            .action("RESCHEDULED")
            .oldValue(oldDueDate != null ? oldDueDate.toString() : null)
            .newValue(req.newDueDate().toString())
            .build());

        log.info("[TaskIntelligence] User {} rescheduled task {} to {}", user.getEmail(), taskId, req.newDueDate());
        return TaskResponse.from(saved);
    }

    // ── Similarity Math ─────────────────────────────────────

    private double calculateSimilarity(String s1, String s2) {
        if (s1.equalsIgnoreCase(s2)) return 1.0;

        Set<String> tokens1 = tokenize(s1);
        Set<String> tokens2 = tokenize(s2);

        if (tokens1.isEmpty() || tokens2.isEmpty()) return 0.0;

        // Jaccard similarity on meaningful tokens
        Set<String> intersection = new HashSet<>(tokens1);
        intersection.retainAll(tokens2);

        Set<String> union = new HashSet<>(tokens1);
        union.addAll(tokens2);

        double jaccard = (double) intersection.size() / union.size();

        // Levenshtein ratio
        double lev = levenshteinSimilarity(s1.toLowerCase().trim(), s2.toLowerCase().trim());

        // Weighted blend
        return (jaccard * 0.6) + (lev * 0.4);
    }

    private Set<String> tokenize(String str) {
        return Arrays.stream(str.toLowerCase().split("[^a-zA-Z0-9]+"))
            .filter(t -> t.length() > 2 && !STOPWORDS.contains(t))
            .collect(Collectors.toSet());
    }

    private double levenshteinSimilarity(String s1, String s2) {
        int maxLen = Math.max(s1.length(), s2.length());
        if (maxLen == 0) return 1.0;
        int distance = computeLevenshteinDistance(s1, s2);
        return 1.0 - ((double) distance / maxLen);
    }

    private int computeLevenshteinDistance(String a, String b) {
        int[] costs = new int[b.length() + 1];
        for (int j = 0; j < costs.length; j++) costs[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= b.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]),
                    a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[b.length()];
    }
}
