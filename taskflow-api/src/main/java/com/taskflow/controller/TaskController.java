package com.taskflow.controller;

import com.taskflow.dto.task.*;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.service.AiTaskIntelligenceService;
import com.taskflow.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Task CRUD, filtering, stats, and status transitions")
@SecurityRequirement(name = "bearerAuth")
public class TaskController {

    private final TaskService taskService;
    private final AiTaskIntelligenceService aiTaskIntelligenceService;

    /* ── CREATE ─────────────────────────────────────────────────────── */

    @PostMapping
    @Operation(summary = "Create a new task")
    public ResponseEntity<TaskResponse> create(
        @AuthenticationPrincipal UserDetails user,
        @Valid @RequestBody CreateTaskRequest req
    ) {
        TaskResponse created = taskService.create(user.getUsername(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /* ── GET BY ID ──────────────────────────────────────────────────── */

    @GetMapping("/{id}")
    @Operation(summary = "Get task by ID (owner-scoped)")
    public TaskResponse getById(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable UUID id
    ) {
        return taskService.getById(user.getUsername(), id);
    }

    /* ── LIST (filtered + paged) ────────────────────────────────────── */

    @GetMapping
    @Operation(summary = "List tasks with filters, sorting, and pagination")
    public PagedTaskResponse list(
        @AuthenticationPrincipal UserDetails user,
        @RequestParam(required = false) TaskStatus    status,
        @RequestParam(required = false) TaskPriority  priority,
        @RequestParam(required = false) String        search,
        @RequestParam(required = false) UUID          categoryId,
        @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
        @RequestParam(required = false, defaultValue = "DESC")      Sort.Direction direction,
        @RequestParam(required = false, defaultValue = "0")         int page,
        @RequestParam(required = false, defaultValue = "20")        int size
    ) {
        TaskFilterRequest filter = new TaskFilterRequest(
            status, priority, search, categoryId, sortBy, direction, page, size);
        return taskService.list(user.getUsername(), filter);
    }

    /* ── STATS ──────────────────────────────────────────────────────── */

    @GetMapping("/stats")
    @Operation(summary = "Aggregate task statistics for the logged-in user")
    public TaskStatsResponse stats(@AuthenticationPrincipal UserDetails user) {
        return taskService.stats(user.getUsername());
    }

    /* ── UPDATE ─────────────────────────────────────────────────────── */

    @PutMapping("/{id}")
    @Operation(summary = "Update task fields (partial update supported)")
    public TaskResponse update(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable UUID id,
        @Valid @RequestBody UpdateTaskRequest req
    ) {
        return taskService.update(user.getUsername(), id, req);
    }

    /* ── STATUS TRANSITION ──────────────────────────────────────────── */

    @PatchMapping("/{id}/status")
    @Operation(summary = "Change task status (validated transition rules)")
    public TaskResponse changeStatus(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable UUID id,
        @Valid @RequestBody StatusTransitionRequest req
    ) {
        return taskService.changeStatus(user.getUsername(), id, req.status());
    }

    /* ── DELETE ─────────────────────────────────────────────────────── */

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete task (owner-scoped)")
    public ResponseEntity<Void> delete(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable UUID id
    ) {
        taskService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    /* ── RESCHEDULE (AI / MANUAL) ──────────────────────────────────── */

    @PostMapping("/{id}/reschedule")
    @Operation(summary = "Reschedule task due date with AI or manual input")
    public TaskResponse reschedule(
        @AuthenticationPrincipal UserDetails user,
        @PathVariable UUID id,
        @Valid @RequestBody RescheduleTaskRequest req
    ) {
        return aiTaskIntelligenceService.rescheduleTask(user.getUsername(), id, req);
    }

    /* ── BULK ACTIONS ───────────────────────────────────────────────── */

    @PostMapping("/bulk/status")
    @Operation(summary = "Bulk update status for selected tasks")
    public BulkOperationResponse bulkChangeStatus(
        @AuthenticationPrincipal UserDetails user,
        @Valid @RequestBody BulkStatusRequest req
    ) {
        return taskService.bulkChangeStatus(user.getUsername(), req);
    }

    @PostMapping("/bulk/priority")
    @Operation(summary = "Bulk update priority for selected tasks")
    public BulkOperationResponse bulkChangePriority(
        @AuthenticationPrincipal UserDetails user,
        @Valid @RequestBody BulkPriorityRequest req
    ) {
        return taskService.bulkChangePriority(user.getUsername(), req);
    }

    @PostMapping("/bulk/delete")
    @Operation(summary = "Bulk delete selected tasks")
    public BulkOperationResponse bulkDelete(
        @AuthenticationPrincipal UserDetails user,
        @Valid @RequestBody BulkDeleteRequest req
    ) {
        return taskService.bulkDelete(user.getUsername(), req);
    }

    @PostMapping("/bulk/category")
    @Operation(summary = "Bulk assign project / category for selected tasks")
    public BulkOperationResponse bulkAssignCategory(
        @AuthenticationPrincipal UserDetails user,
        @Valid @RequestBody BulkCategoryRequest req
    ) {
        return taskService.bulkAssignCategory(user.getUsername(), req);
    }

    /* ── ACTIVITY LOGS ───────────────────────────────────────────────── */

    @GetMapping("/{id}/activity")
    @Operation(summary = "Get activity logs for task")
    public java.util.List<ActivityLogResponse> getActivity(@PathVariable UUID id) {
        return taskService.getActivity(id);
    }
}
