package com.taskflow.controller;

import com.taskflow.dto.ai.BreakdownRequest;
import com.taskflow.dto.ai.BreakdownResponse;
import com.taskflow.dto.ai.ChatRequest;
import com.taskflow.dto.ai.DailyPlanResponse;
import com.taskflow.dto.ai.DuplicateCheckRequest;
import com.taskflow.dto.ai.DuplicateCheckResponse;
import com.taskflow.dto.ai.OverdueSuggestionResponse;
import com.taskflow.dto.ai.SmartTaskParseRequest;
import com.taskflow.dto.ai.SmartTaskParseResponse;
import com.taskflow.dto.ai.WeeklySummaryResponse;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.AiBreakdownService;
import com.taskflow.service.AiDailyPlannerService;
import com.taskflow.service.AiRateLimitService;
import com.taskflow.service.AiTaskIntelligenceService;
import com.taskflow.service.AiWeeklySummaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI", description = "AI-powered task breakdown and conversational assistant")
@SecurityRequirement(name = "bearerAuth")
public class AiController {

    private final AiBreakdownService        aiBreakdownService;
    private final AiWeeklySummaryService    aiWeeklySummaryService;
    private final AiDailyPlannerService     aiDailyPlannerService;
    private final AiTaskIntelligenceService aiTaskIntelligenceService;
    private final AiRateLimitService        aiRateLimitService;
    private final UserRepository            userRepository;

    @PostMapping("/breakdown")
    @Operation(summary = "Break a goal into subtasks using AI (10 req/hr per user)")
    public ResponseEntity<?> breakdown(
            @Valid @RequestBody BreakdownRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);

        if (!aiRateLimitService.isAllowed(user.getId())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of(
                    "error",     "Rate limit exceeded",
                    "message",   "You can make at most 10 AI requests per hour.",
                    "remaining", 0
                ));
        }

        BreakdownResponse response = aiBreakdownService.breakdown(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/chat")
    @Operation(summary = "Conversational AI assistant (20 req/hr per user)")
    public ResponseEntity<?> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);

        if (!aiRateLimitService.isAllowed(user.getId())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of(
                    "error",   "Rate limit exceeded",
                    "message", "You can make at most 10 AI requests per hour.",
                    "remaining", 0
                ));
        }

        String reply = aiBreakdownService.chat(request);
        return ResponseEntity.ok(Map.of("reply", reply));
    }

    @PostMapping("/parse-task")
    @Operation(summary = "Smart Task Creation: parse natural language task into title, dueDate, priority, tags")
    public ResponseEntity<SmartTaskParseResponse> parseTask(
            @Valid @RequestBody SmartTaskParseRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        SmartTaskParseResponse parsed = aiBreakdownService.parseSmartTask(request);
        return ResponseEntity.ok(parsed);
    }

    @GetMapping("/weekly-summary")
    @Operation(summary = "Generate Weekly AI Summary (what I finished, what slipped, what to focus on next)")
    public ResponseEntity<WeeklySummaryResponse> getWeeklySummary(
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);
        WeeklySummaryResponse summary = aiWeeklySummaryService.generateSummary(user);
        return ResponseEntity.ok(summary);
    }

    @PostMapping("/weekly-summary/send-email")
    @Operation(summary = "Send Weekly AI Summary to user's registered email address")
    public ResponseEntity<Map<String, Object>> sendWeeklySummaryEmail(
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);
        WeeklySummaryResponse summary = aiWeeklySummaryService.generateSummary(user);
        boolean sent = aiWeeklySummaryService.sendSummaryEmail(user, summary);

        return ResponseEntity.ok(Map.of(
            "success", sent,
            "recipient", user.getEmail(),
            "message", sent ? "Weekly AI summary sent to " + user.getEmail() : "Failed to dispatch email digest"
        ));
    }

    @GetMapping("/daily-plan")
    @Operation(summary = "Plan my day: pick and order today's top tasks with a 1-line reason for each")
    public ResponseEntity<DailyPlanResponse> getDailyPlan(
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);
        DailyPlanResponse plan = aiDailyPlannerService.planMyDay(user);
        return ResponseEntity.ok(plan);
    }

    @PostMapping("/daily-plan")
    @Operation(summary = "Plan my day: trigger/regenerate daily planner")
    public ResponseEntity<DailyPlanResponse> postDailyPlan(
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);
        DailyPlanResponse plan = aiDailyPlannerService.planMyDay(user);
        return ResponseEntity.ok(plan);
    }

    @PostMapping("/check-duplicate")
    @Operation(summary = "Check if a task title/description is similar to existing tasks")
    public ResponseEntity<DuplicateCheckResponse> checkDuplicate(
            @Valid @RequestBody DuplicateCheckRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);
        return ResponseEntity.ok(aiTaskIntelligenceService.checkDuplicate(user, request));
    }

    @GetMapping("/overdue-suggestions")
    @Operation(summary = "Get AI smart overdue deadline suggestions")
    public ResponseEntity<java.util.List<OverdueSuggestionResponse>> getOverdueSuggestions(
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);
        return ResponseEntity.ok(aiTaskIntelligenceService.getOverdueSuggestions(user));
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
