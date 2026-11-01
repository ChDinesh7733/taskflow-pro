package com.taskflow.controller;

import com.taskflow.dto.subtask.CreateSubtaskRequest;
import com.taskflow.dto.subtask.SubtaskResponse;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.SubtaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks/{taskId}/subtasks")
@RequiredArgsConstructor
@Tag(name = "Subtasks", description = "Subtask management")
@SecurityRequirement(name = "bearerAuth")
public class SubtaskController {

    private final SubtaskService subtaskService;
    private final UserRepository userRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a subtask to a task")
    public SubtaskResponse addSubtask(
            @PathVariable UUID taskId,
            @Valid @RequestBody CreateSubtaskRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        return subtaskService.addSubtask(taskId, req, resolveUser(principal));
    }

    @GetMapping
    @Operation(summary = "List all subtasks of a task")
    public List<SubtaskResponse> listSubtasks(
            @PathVariable UUID taskId,
            @AuthenticationPrincipal UserDetails principal) {
        return subtaskService.listSubtasks(taskId, resolveUser(principal));
    }

    @PatchMapping("/{subtaskId}/toggle")
    @Operation(summary = "Toggle subtask done/undone — auto-completes parent when all done")
    public SubtaskResponse toggleDone(
            @PathVariable UUID taskId,
            @PathVariable UUID subtaskId,
            @AuthenticationPrincipal UserDetails principal) {
        return subtaskService.toggleDone(taskId, subtaskId, resolveUser(principal));
    }

    @DeleteMapping("/{subtaskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a subtask")
    public void deleteSubtask(
            @PathVariable UUID taskId,
            @PathVariable UUID subtaskId,
            @AuthenticationPrincipal UserDetails principal) {
        subtaskService.deleteSubtask(taskId, subtaskId, resolveUser(principal));
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
