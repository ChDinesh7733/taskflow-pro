package com.taskflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.ai.BreakdownRequest;
import com.taskflow.dto.ai.BreakdownResponse;
import com.taskflow.dto.ai.ChatRequest;
import com.taskflow.dto.ai.SmartTaskParseRequest;
import com.taskflow.dto.ai.SmartTaskParseResponse;
import com.taskflow.dto.ai.SubtaskSuggestion;
import com.taskflow.enums.TaskPriority;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiBreakdownService {

    @Value("${ai.gemini.api-key:}")
    private String apiKey;

    @Value("${ai.gemini.model:gemini-2.0-flash}")
    private String model;

    @Value("${ai.gemini.timeout-seconds:30}")
    private int timeoutSeconds;

    private final ObjectMapper objectMapper;

    private static final String BASE_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/";

    public BreakdownResponse breakdown(BreakdownRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[AI] GEMINI_API_KEY not configured — returning fallback tasks");
            return fallback(request.goal());
        }

        try {
            String prompt = buildPrompt(request.goal());
            String rawResponse = callGemini(prompt);
            List<SubtaskSuggestion> suggestions = parseJson(rawResponse);

            if (suggestions == null || suggestions.isEmpty()) {
                log.warn("[AI] Empty or invalid response — falling back");
                return fallback(request.goal());
            }

            return new BreakdownResponse(request.goal(), suggestions, false);
        } catch (Exception e) {
            log.error("[AI] Gemini call failed: {}", e.getMessage(), e);
            return fallback(request.goal());
        }
    }

    /* ── SMART TASK NLP PARSING ─────────────────────────────────────────── */

    public SmartTaskParseResponse parseSmartTask(SmartTaskParseRequest request) {
        String input = request.text().trim();
        if (apiKey != null && !apiKey.isBlank()) {
            try {
                String prompt = String.format("""
                    Current date is: %s.
                    The user entered a natural language task description:
                    "%s"

                    Extract the task details into a JSON object:
                    - "title": a clear, concise task title (remove priority/date words from the title)
                    - "description": any secondary notes or context, or empty string
                    - "dueDate": ISO yyyy-MM-dd date if mentioned (e.g. tomorrow, Friday, next week), or null
                    - "priority": one of ["LOW", "MEDIUM", "HIGH", "URGENT"] (default "MEDIUM" unless words like high, urgent, important, critical appear)
                    - "tags": comma-separated tags or labels without hashtag symbols (e.g. "finance, devops"), or null

                    Respond ONLY with a valid JSON object:
                    {
                      "title": "...",
                      "description": "...",
                      "dueDate": "yyyy-MM-dd",
                      "priority": "LOW|MEDIUM|HIGH|URGENT",
                      "tags": "..."
                    }
                    """, java.time.LocalDate.now().toString(), input);

                String raw = callGemini(prompt);
                String text = extractText(raw).trim();
                if (text.startsWith("```")) {
                    text = text.replaceAll("```[a-z]*\\n?", "").replaceAll("```", "").trim();
                }
                int start = text.indexOf('{');
                int end = text.lastIndexOf('}');
                if (start != -1 && end != -1 && end > start) {
                    JsonNode node = objectMapper.readTree(text.substring(start, end + 1));
                    String title = node.path("title").asText(input);
                    String desc = node.path("description").asText("");
                    String dueStr = node.path("dueDate").asText(null);
                    java.time.LocalDate dueDate = (dueStr != null && !dueStr.equalsIgnoreCase("null") && !dueStr.isBlank())
                        ? java.time.LocalDate.parse(dueStr) : null;
                    String prioStr = node.path("priority").asText("MEDIUM").toUpperCase();
                    TaskPriority priority;
                    try { priority = TaskPriority.valueOf(prioStr); } catch (Exception e) { priority = TaskPriority.MEDIUM; }
                    String tags = node.path("tags").asText(null);
                    if ("null".equalsIgnoreCase(tags) || (tags != null && tags.isBlank())) tags = null;

                    return new SmartTaskParseResponse(title, desc, dueDate, priority, tags, input);
                }
            } catch (Exception e) {
                log.warn("[AI] Gemini smart task parse failed: {}, falling back to heuristic parser", e.getMessage());
            }
        }

        return fallbackSmartParse(input);
    }

    private SmartTaskParseResponse fallbackSmartParse(String raw) {
        String lower = raw.toLowerCase();

        // 1. Priority
        TaskPriority priority = TaskPriority.MEDIUM;
        if (lower.contains("urgent") || lower.contains("asap") || lower.contains("critical") || lower.contains("p0")) {
            priority = TaskPriority.URGENT;
        } else if (lower.contains("high priority") || lower.contains("high") || lower.contains("important") || lower.contains("p1")) {
            priority = TaskPriority.HIGH;
        } else if (lower.contains("low priority") || lower.contains("low") || lower.contains("minor")) {
            priority = TaskPriority.LOW;
        }

        // 2. Due Date
        java.time.LocalDate dueDate = null;
        java.time.LocalDate today = java.time.LocalDate.now();
        if (lower.contains("today")) {
            dueDate = today;
        } else if (lower.contains("tomorrow")) {
            dueDate = today.plusDays(1);
        } else if (lower.contains("monday")) {
            dueDate = today.with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.MONDAY));
        } else if (lower.contains("tuesday")) {
            dueDate = today.with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.TUESDAY));
        } else if (lower.contains("wednesday")) {
            dueDate = today.with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.WEDNESDAY));
        } else if (lower.contains("thursday")) {
            dueDate = today.with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.THURSDAY));
        } else if (lower.contains("friday")) {
            dueDate = today.with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.FRIDAY));
        } else if (lower.contains("saturday")) {
            dueDate = today.with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.SATURDAY));
        } else if (lower.contains("sunday")) {
            dueDate = today.with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.SUNDAY));
        } else if (lower.contains("next week")) {
            dueDate = today.plusWeeks(1);
        }

        // 3. Tags (e.g. #finance, #devops)
        java.util.List<String> tagsList = new ArrayList<>();
        java.util.regex.Matcher tagMatcher = java.util.regex.Pattern.compile("#([a-zA-Z0-9_-]+)").matcher(raw);
        while (tagMatcher.find()) {
            tagsList.add(tagMatcher.group(1));
        }
        String tags = tagsList.isEmpty() ? null : String.join(", ", tagsList);

        // 4. Clean Title
        String title = raw
            .replaceAll("(?i)#([a-zA-Z0-9_-]+)", "")
            .replaceAll("(?i)\\b(high priority|low priority|urgent|asap|critical|important|p0|p1|p2)\\b", "")
            .replaceAll("(?i)\\b(by|due|on)\\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\\b", "")
            .replaceAll("(?i)\\b(today|tomorrow)\\b", "")
            .replaceAll("(?i)\\b(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)\\b", "")
            .replaceAll("[,;]+", " ")
            .replaceAll("\\s+", " ")
            .trim();

        if (title.isEmpty()) {
            title = raw;
        }

        return new SmartTaskParseResponse(title, "", dueDate, priority, tags, raw);
    }

    // ── Chat ───────────────────────────────────────────────

    public String chat(ChatRequest request) {
        String keyToUse = (request.apiKey() != null && !request.apiKey().isBlank())
            ? request.apiKey().trim()
            : this.apiKey;

        if (keyToUse == null || keyToUse.isBlank()) {
            log.warn("[AI] GEMINI_API_KEY not configured — returning fallback chat reply");
            return "I'm a task-management assistant. Click **Set API Key** above or set `GEMINI_API_KEY` on the server to enable live AI responses. " +
                   "\n\nIn the meantime, here is my general advice: break your goal down into small daily milestones, set realistic priorities (High/Medium/Low), and review your task board regularly.";
        }

        try {
            // Build Gemini "contents" array from history + new user message
            List<Map<String, Object>> contents = new java.util.ArrayList<>();

            // System instruction as the first "user" turn (Gemini flash uses contents, not systemInstruction for basic usage)
            contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text",
                    "You are a helpful AI assistant inside TaskFlow Pro, a task-management application. " +
                    "You answer questions on any topic: task management, productivity, planning, technical questions, general knowledge, and more. " +
                    "Give clear, structured, and helpful responses. Use bullet points or numbered steps when appropriate. " +
                    "For research questions, provide source references when known. " +
                    "Keep responses concise but complete."))
            ));
            contents.add(Map.of(
                "role", "model",
                "parts", List.of(Map.of("text", "Understood! I'm ready to help you with any questions."))
            ));

            // Add prior conversation turns
            if (request.history() != null) {
                for (ChatRequest.ChatTurn turn : request.history()) {
                    String geminiRole = "user".equalsIgnoreCase(turn.role()) ? "user" : "model";
                    contents.add(Map.of(
                        "role", geminiRole,
                        "parts", List.of(Map.of("text", turn.content()))
                    ));
                }
            }

            // Add the new user message
            contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", request.message()))
            ));

            Map<String, Object> body = Map.of(
                "contents", contents,
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 2048
                )
            );

            String rawResponse = callGeminiWithBody(body, keyToUse);
            return extractText(rawResponse);

        } catch (Exception e) {
            log.error("[AI] Chat Gemini call failed: {}", e.getMessage(), e);
            return "Sorry, I couldn't reach the AI service right now. Please check your API key or network connection and try again.";
        }
    }

    // ── Private helpers ────────────────────────────────────

    private String buildPrompt(String goal) {
        return """
            You are a productivity assistant. The user wants to accomplish the following goal:
            "%s"

            Break it down into 5 to 8 concrete, actionable subtasks.
            Respond ONLY with a valid JSON array (no markdown, no explanation) in this exact format:
            [
              { "title": "...", "priority": "HIGH|MEDIUM|LOW", "dueInDays": <integer> },
              ...
            ]
            Make the tasks specific, achievable, and ordered logically.
            Set dueInDays relative to today (e.g. 1, 3, 7, 14).
            """.formatted(goal);
    }

    private String callGemini(String prompt) {
        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of(
                "parts", List.of(Map.of("text", prompt))
            )),
            "generationConfig", Map.of(
                "temperature", 0.3,
                "maxOutputTokens", 1024
            )
        );
        return callGeminiWithBody(body, this.apiKey);
    }

    private String callGeminiWithBody(Map<String, Object> body, String key) {
        String url = BASE_URL + model + ":generateContent?key=" + key;

        RestClient client = RestClient.builder()
            .baseUrl(url)
            .build();

        String response = client.post()
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .body(String.class);

        log.debug("[AI] Raw Gemini response: {}", response);
        return response;
    }

    private String extractText(String rawResponse) throws Exception {
        JsonNode root = objectMapper.readTree(rawResponse);
        return root.path("candidates").get(0)
                   .path("content").path("parts").get(0)
                   .path("text").asText();
    }

    private List<SubtaskSuggestion> parseJson(String rawResponse) throws Exception {
        String text = extractText(rawResponse);

        // Strip markdown code fences if present
        text = text.trim();
        if (text.startsWith("```")) {
            text = text.replaceAll("```[a-z]*\\n?", "").replaceAll("```", "").trim();
        }

        // Extract JSON array
        int start = text.indexOf('[');
        int end   = text.lastIndexOf(']');
        if (start == -1 || end == -1 || end <= start) {
            log.warn("[AI] Could not locate JSON array in: {}", text);
            return null;
        }
        text = text.substring(start, end + 1);

        return objectMapper.readValue(text, new TypeReference<List<SubtaskSuggestion>>() {});
    }

    private BreakdownResponse fallback(String goal) {
        List<SubtaskSuggestion> tasks = List.of(
            new SubtaskSuggestion("Research the topic thoroughly",                 "HIGH",   1),
            new SubtaskSuggestion("Create an outline or study plan",               "HIGH",   2),
            new SubtaskSuggestion("Gather resources and reference materials",      "MEDIUM", 3),
            new SubtaskSuggestion("Complete the first major milestone",            "HIGH",   7),
            new SubtaskSuggestion("Review progress and adjust plan",               "MEDIUM", 9),
            new SubtaskSuggestion("Practice with sample exercises or tests",       "MEDIUM", 11),
            new SubtaskSuggestion("Final review and preparation",                  "HIGH",  13),
            new SubtaskSuggestion("Execute the final goal",                        "HIGH",  14)
        );
        return new BreakdownResponse(goal, tasks, true);
    }
}
