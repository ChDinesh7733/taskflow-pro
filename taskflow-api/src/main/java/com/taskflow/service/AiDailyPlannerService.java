package com.taskflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.ai.DailyPlanItem;
import com.taskflow.dto.ai.DailyPlanResponse;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiDailyPlannerService {

    private final TaskRepository taskRepository;
    private final ObjectMapper objectMapper;

    @Value("${ai.gemini.api-key:}")
    private String apiKey;

    @Value("${ai.gemini.model:gemini-2.0-flash}")
    private String model;

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

    private static final String[] TIME_BLOCKS = {
        "Morning Prime Focus (9:00 AM - 10:30 AM)",
        "Late Morning Sprint (11:00 AM - 12:15 PM)",
        "Afternoon Deep Work (2:00 PM - 3:30 PM)",
        "Afternoon Momentum (3:45 PM - 4:45 PM)",
        "Wrap-Up & Review (5:00 PM - 5:30 PM)"
    };

    @Transactional(readOnly = true)
    public DailyPlanResponse planMyDay(User user) {
        LocalDate today = LocalDate.now();
        String dateFormatted = today.format(DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy"));

        // Fetch active tasks for this user
        List<Task> activeTasks = taskRepository.findUpcomingTasks(user.getId());

        if (activeTasks.isEmpty()) {
            return new DailyPlanResponse(
                dateFormatted,
                "Clean Slate & Goal Setting",
                0,
                0,
                "Your workspace has zero pending tasks. Use the Smart Task NLP bar to define new project milestones!",
                List.of()
            );
        }

        // Try Gemini AI first if API key configured
        if (apiKey != null && !apiKey.isBlank()) {
            try {
                String prompt = buildPlannerPrompt(today, activeTasks);
                String rawResponse = callGemini(prompt);
                DailyPlanResponse aiPlan = parseGeminiPlan(rawResponse, activeTasks, dateFormatted);
                if (aiPlan != null && !aiPlan.plannedTasks().isEmpty()) {
                    return aiPlan;
                }
            } catch (Exception e) {
                log.warn("[DailyPlanner] Gemini planning failed, using intelligent deterministic planner: {}", e.getMessage());
            }
        }

        // Deterministic Heuristic AI Planner Fallback
        return generateDeterministicPlan(today, activeTasks, dateFormatted);
    }

    private DailyPlanResponse generateDeterministicPlan(LocalDate today, List<Task> activeTasks, String dateFormatted) {
        // Calculate urgency and leverage score for each task
        List<TaskScored> scored = activeTasks.stream().map(t -> {
            int score = 0;
            boolean isOverdue = t.getDueDate() != null && t.getDueDate().isBefore(today);
            boolean isDueToday = t.getDueDate() != null && t.getDueDate().isEqual(today);

            if (isOverdue) score += 100;
            if (isDueToday) score += 60;
            if (t.getStatus() == TaskStatus.IN_PROGRESS) score += 30;

            if (t.getPriority() == TaskPriority.URGENT) score += 50;
            else if (t.getPriority() == TaskPriority.HIGH) score += 35;
            else if (t.getPriority() == TaskPriority.MEDIUM) score += 15;

            return new TaskScored(t, score, isOverdue, isDueToday);
        }).sorted(Comparator.comparingInt(TaskScored::score).reversed())
          .limit(5)
          .toList();

        List<DailyPlanItem> plannedItems = new ArrayList<>();
        int totalMinutes = 0;
        int order = 1;

        for (int i = 0; i < scored.size(); i++) {
            TaskScored ts = scored.get(i);
            Task t = ts.task();
            String timeBlock = (i < TIME_BLOCKS.length) ? TIME_BLOCKS[i] : "Flexible Focus Window";
            int duration = (t.getPriority() == TaskPriority.URGENT || t.getPriority() == TaskPriority.HIGH) ? 50 : 25;
            totalMinutes += duration;

            String reason = generateReason(t, ts.isOverdue(), ts.isDueToday(), order);

            plannedItems.add(new DailyPlanItem(
                t.getId(),
                t.getTitle(),
                t.getPriority().name(),
                t.getDueDate() != null ? t.getDueDate().toString() : null,
                reason,
                timeBlock,
                duration,
                order++
            ));
        }

        String dayTheme = scored.stream().anyMatch(TaskScored::isOverdue)
            ? "Blocker Clearance & Core Deliverables"
            : "High-Leverage Execution & Sprint Velocity";

        String plannerNote = String.format(
            "Tackle the top %d critical tasks first during your prime morning focus blocks. Protect your focus time by keeping interruptions minimal.",
            plannedItems.size()
        );

        return new DailyPlanResponse(
            dateFormatted,
            dayTheme,
            plannedItems.size(),
            totalMinutes,
            plannerNote,
            plannedItems
        );
    }

    private String generateReason(Task t, boolean isOverdue, boolean isDueToday, int order) {
        if (isOverdue) {
            return String.format("Overdue since %s — tackle first to remove operational blockers and maintain team momentum.", t.getDueDate());
        }
        if (isDueToday) {
            return "Due today — high urgency commitment required before end-of-day sprint cutoff.";
        }
        if (t.getPriority() == TaskPriority.URGENT) {
            return "Marked Urgent — critical path milestone that impacts project delivery timelines.";
        }
        if (t.getStatus() == TaskStatus.IN_PROGRESS) {
            return "Already in progress — capitalize on current momentum to bring this task across the finish line.";
        }
        if (order == 1) {
            return "Highest leverage milestone to tackle during your peak cognitive morning energy.";
        }
        if (order == 2) {
            return "Key secondary deliverable to close before taking a midday break.";
        }
        return "Steady execution priority to round out today's velocity and prep tomorrow's backlog.";
    }

    private String buildPlannerPrompt(LocalDate today, List<Task> tasks) {
        StringBuilder sb = new StringBuilder();
        for (Task t : tasks.stream().limit(12).toList()) {
            sb.append(String.format("- ID: %s | Title: \"%s\" | Priority: %s | Status: %s | Due: %s\n",
                t.getId(), t.getTitle(), t.getPriority(), t.getStatus(),
                t.getDueDate() != null ? t.getDueDate() : "None"));
        }

        return String.format("""
            You are an executive daily productivity planner. Today's date is %s.
            Review the user's active backlog below and pick the 3 to 5 most important tasks to focus on TODAY.

            User's active tasks:
            %s

            Order the chosen tasks strategically (tackle overdue/urgent blockers first, followed by high-leverage milestones).
            For each task, provide an exact ONE-LINE compelling reason why it was prioritized.

            Respond ONLY with a valid JSON object in this exact schema (no markdown, no backticks):
            {
              "dayTheme": "A short 3-5 word inspirational theme for today",
              "plannerNote": "2-sentence encouraging productivity coach advice for the day",
              "plannedTasks": [
                {
                  "taskId": "UUID string matching the input task exactly",
                  "title": "Exact task title",
                  "priority": "URGENT|HIGH|MEDIUM|LOW",
                  "dueDate": "yyyy-MM-dd or null",
                  "reason": "Exact one-line reason why this task should be done today",
                  "suggestedTimeBlock": "Morning Prime Focus (9:00 AM - 10:30 AM)",
                  "estimatedMinutes": 50
                }
              ]
            }
            """, today, sb.toString());
    }

    private String callGemini(String prompt) {
        String url = BASE_URL + model + ":generateContent?key=" + apiKey;
        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
            "generationConfig", Map.of("temperature", 0.3, "maxOutputTokens", 1500)
        );

        RestClient client = RestClient.builder().baseUrl(url).build();
        return client.post()
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .body(String.class);
    }

    private DailyPlanResponse parseGeminiPlan(String rawResponse, List<Task> activeTasks, String dateFormatted) {
        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            String text = root.path("candidates").get(0)
                .path("content").path("parts").get(0)
                .path("text").asText().trim();

            if (text.startsWith("```")) {
                text = text.replaceAll("```[a-z]*\\n?", "").replaceAll("```", "").trim();
            }

            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start == -1 || end == -1) return null;

            JsonNode planNode = objectMapper.readTree(text.substring(start, end + 1));
            String dayTheme = planNode.path("dayTheme").asText("High-Leverage Execution");
            String plannerNote = planNode.path("plannerNote").asText("Focus on high-impact milestones first.");

            List<DailyPlanItem> items = new ArrayList<>();
            int totalMins = 0;
            int order = 1;

            JsonNode tasksArr = planNode.path("plannedTasks");
            if (tasksArr.isArray()) {
                for (JsonNode tNode : tasksArr) {
                    String idStr = tNode.path("taskId").asText();
                    UUID taskId;
                    try {
                        taskId = UUID.fromString(idStr);
                    } catch (Exception ex) {
                        // If model fabricated an ID, match by title
                        String tTitle = tNode.path("title").asText();
                        taskId = activeTasks.stream()
                            .filter(t -> t.getTitle().equalsIgnoreCase(tTitle))
                            .map(Task::getId)
                            .findFirst().orElse(null);
                    }

                    if (taskId == null && !activeTasks.isEmpty()) {
                        taskId = activeTasks.get(Math.min(order - 1, activeTasks.size() - 1)).getId();
                    }

                    int mins = tNode.path("estimatedMinutes").asInt(45);
                    totalMins += mins;

                    items.add(new DailyPlanItem(
                        taskId,
                        tNode.path("title").asText("Task"),
                        tNode.path("priority").asText("MEDIUM"),
                        tNode.path("dueDate").isNull() ? null : tNode.path("dueDate").asText(),
                        tNode.path("reason").asText("Key priority for today's sprint."),
                        tNode.path("suggestedTimeBlock").asText("Morning Focus Block"),
                        mins,
                        order++
                    ));
                }
            }

            if (!items.isEmpty()) {
                return new DailyPlanResponse(
                    dateFormatted,
                    dayTheme,
                    items.size(),
                    totalMins,
                    plannerNote,
                    items
                );
            }
        } catch (Exception e) {
            log.warn("[DailyPlanner] Failed to parse Gemini response: {}", e.getMessage());
        }
        return null;
    }

    private record TaskScored(Task task, int score, boolean isOverdue, boolean isDueToday) {}
}
