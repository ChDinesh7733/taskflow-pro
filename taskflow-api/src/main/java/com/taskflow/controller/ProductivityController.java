package com.taskflow.controller;

import com.taskflow.dto.productivity.*;
import com.taskflow.dto.task.TaskResponse;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.GoalService;
import com.taskflow.service.HabitService;
import com.taskflow.service.TaskTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/productivity")
@RequiredArgsConstructor
@Tag(name = "Productivity Suite", description = "Task Templates, Habits, Goals/OKRs, and Time Blocking")
@SecurityRequirement(name = "bearerAuth")
public class ProductivityController {

    private final TaskTemplateService templateService;
    private final HabitService habitService;
    private final GoalService goalService;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    /* ─── TEMPLATES ──────────────────────────────────────────────────────── */

    @GetMapping("/templates")
    @Operation(summary = "List all available templates (starter + custom)")
    public List<TaskTemplateResponse> getTemplates(@AuthenticationPrincipal UserDetails user) {
        return templateService.getTemplates(user.getUsername());
    }

    @PostMapping("/templates")
    @Operation(summary = "Create a custom task template")
    public ResponseEntity<TaskTemplateResponse> createTemplate(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody CreateTemplateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(templateService.createTemplate(user.getUsername(), req));
    }

    @PostMapping("/templates/{id}/apply")
    @Operation(summary = "Apply a template: instantiate all its tasks in user workspace")
    public ResponseEntity<Map<String, Object>> applyTemplate(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id,
            @RequestParam(required = false) UUID categoryId) {
        List<UUID> createdIds = templateService.applyTemplate(user.getUsername(), id, categoryId);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "createdCount", createdIds.size(),
            "createdTaskIds", createdIds
        ));
    }

    @DeleteMapping("/templates/{id}")
    @Operation(summary = "Delete custom template")
    public ResponseEntity<Void> deleteTemplate(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        templateService.deleteTemplate(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    /* ─── HABITS ─────────────────────────────────────────────────────────── */

    @GetMapping("/habits")
    @Operation(summary = "List habits and streak statistics")
    public List<HabitResponse> getHabits(@AuthenticationPrincipal UserDetails user) {
        return habitService.getHabits(user.getUsername());
    }

    @PostMapping("/habits")
    @Operation(summary = "Create a new daily habit")
    public ResponseEntity<HabitResponse> createHabit(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody CreateHabitRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(habitService.createHabit(user.getUsername(), req));
    }

    @PatchMapping("/habits/{id}/check")
    @Operation(summary = "Toggle daily habit check-in and update streaks")
    public HabitResponse checkHabit(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        return habitService.toggleCheckIn(user.getUsername(), id);
    }

    @DeleteMapping("/habits/{id}")
    @Operation(summary = "Delete habit")
    public ResponseEntity<Void> deleteHabit(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        habitService.deleteHabit(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    /* ─── GOALS / OKRs ───────────────────────────────────────────────────── */

    @GetMapping("/goals")
    @Operation(summary = "List goals with automated progress tracking")
    public List<GoalResponse> getGoals(@AuthenticationPrincipal UserDetails user) {
        return goalService.getGoals(user.getUsername());
    }

    @PostMapping("/goals")
    @Operation(summary = "Create a new goal or OKR milestone")
    public ResponseEntity<GoalResponse> createGoal(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody CreateGoalRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(goalService.createGoal(user.getUsername(), req));
    }

    @PutMapping("/goals/{id}")
    @Operation(summary = "Update goal details or status")
    public GoalResponse updateGoal(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateGoalRequest req) {
        return goalService.updateGoal(user.getUsername(), id, req);
    }

    @DeleteMapping("/goals/{id}")
    @Operation(summary = "Delete goal and unlink tasks")
    public ResponseEntity<Void> deleteGoal(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        goalService.deleteGoal(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/goals/{id}/tasks")
    @Operation(summary = "List all tasks linked to a goal")
    public List<TaskResponse> getTasksForGoal(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        return goalService.getTasksForGoal(user.getUsername(), id);
    }

    @PostMapping("/goals/{goalId}/tasks/{taskId}")
    @Operation(summary = "Link a task to a goal")
    public TaskResponse linkTask(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID goalId,
            @PathVariable UUID taskId) {
        return goalService.linkTaskToGoal(user.getUsername(), goalId, taskId);
    }

    /* ─── TIME BLOCKING ──────────────────────────────────────────────────── */

    @GetMapping("/time-blocks")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @Operation(summary = "Get time-blocked tasks for a specific date")
    public List<TaskResponse> getTimeBlocks(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        User u = resolveUser(user);
        LocalDate target = date != null ? date : LocalDate.now();
        return taskRepository.findTimeBlockedTasks(u.getId(), target).stream()
            .map(TaskResponse::from)
            .toList();
    }

    @PostMapping("/tasks/{taskId}/time-block")
    @org.springframework.transaction.annotation.Transactional
    @Operation(summary = "Assign a time block to a task")
    public TaskResponse setTimeBlock(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID taskId,
            @Valid @RequestBody TimeBlockRequest req) {
        User u = resolveUser(user);
        Task task = taskRepository.findById(taskId)
            .filter(t -> t.getOwner().getId().equals(u.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));

        task.setTimeBlockDate(req.date());
        task.setTimeBlockStart(req.startTime());
        task.setTimeBlockEnd(req.endTime());
        return TaskResponse.from(taskRepository.save(task));
    }

    @DeleteMapping("/tasks/{taskId}/time-block")
    @org.springframework.transaction.annotation.Transactional
    @Operation(summary = "Clear time block from task")
    public TaskResponse clearTimeBlock(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID taskId) {
        User u = resolveUser(user);
        Task task = taskRepository.findById(taskId)
            .filter(t -> t.getOwner().getId().equals(u.getId()))
            .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));

        task.setTimeBlockDate(null);
        task.setTimeBlockStart(null);
        task.setTimeBlockEnd(null);
        return TaskResponse.from(taskRepository.save(task));
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
