package com.taskmanagement.controller;

import com.taskmanagement.dto.ApiResponse;
import com.taskmanagement.dto.TaskRequestDTO;
import com.taskmanagement.dto.TaskResponseDTO;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.security.SecurityUtils;
import com.taskmanagement.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for Task Management API.
 *
 * Base URL: /api/v1/tasks
 *
 * Endpoints:
 *   POST   /api/v1/tasks              - Create a new task
 *   GET    /api/v1/tasks              - Get all tasks (optionally filter by status)
 *   GET    /api/v1/tasks/{id}         - Get a task by ID
 *   PUT    /api/v1/tasks/{id}         - Update a task
 *   DELETE /api/v1/tasks/{id}         - Delete a task
 */
@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@Slf4j
public class TaskController {

    private final TaskService taskService;

    // ── CREATE ───────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/tasks
     * Creates a new task. Status defaults to PENDING.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponseDTO>> createTask(
            @Valid @RequestBody TaskRequestDTO requestDTO) {

        log.info("POST /api/v1/tasks - Creating task: {}", requestDTO.getTitle());
        TaskResponseDTO created = taskService.createTask(requestDTO, SecurityUtils.currentUserId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Task created successfully", created, HttpStatus.CREATED.value()));
    }

    // ── READ ALL ─────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/tasks
     * Returns all tasks. Optionally filter by ?status=PENDING|IN_PROGRESS|COMPLETED
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponseDTO>>> getAllTasks(
            @RequestParam(required = false) TaskStatus status) {

        List<TaskResponseDTO> tasks = (status != null)
                ? taskService.getTasksByStatus(status, SecurityUtils.currentUserId())
                : taskService.getAllTasks(SecurityUtils.currentUserId());

        return ResponseEntity.ok(
                ApiResponse.success("Tasks retrieved successfully", tasks, HttpStatus.OK.value())
        );
    }

    // ── READ ONE ─────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/tasks/{id}
     * Returns a specific task by its UUID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponseDTO>> getTaskById(@PathVariable UUID id) {
        log.info("GET /api/v1/tasks/{}", id);
        TaskResponseDTO task = taskService.getTaskById(id, SecurityUtils.currentUserId());
        return ResponseEntity.ok(
                ApiResponse.success("Task retrieved successfully", task, HttpStatus.OK.value())
        );
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────

    /**
     * PUT /api/v1/tasks/{id}
     * Updates an existing task's title, description, or status.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponseDTO>> updateTask(
            @PathVariable UUID id,
            @Valid @RequestBody TaskRequestDTO requestDTO) {

        log.info("PUT /api/v1/tasks/{}", id);
        TaskResponseDTO updated = taskService.updateTask(id, SecurityUtils.currentUserId(), requestDTO);
        return ResponseEntity.ok(
                ApiResponse.success("Task updated successfully", updated, HttpStatus.OK.value())
        );
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    /**
     * DELETE /api/v1/tasks/{id}
     * Deletes a task by its UUID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable UUID id) {
        log.info("DELETE /api/v1/tasks/{}", id);
        taskService.deleteTask(id, SecurityUtils.currentUserId());
        return ResponseEntity.ok(
                ApiResponse.success("Task deleted successfully", null, HttpStatus.OK.value())
        );
    }
}
