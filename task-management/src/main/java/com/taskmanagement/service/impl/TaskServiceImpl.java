package com.taskmanagement.service.impl;

import com.taskmanagement.dto.TaskRequestDTO;
import com.taskmanagement.dto.TaskResponseDTO;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskPriority;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.exception.TaskNotFoundException;
import com.taskmanagement.mapper.TaskMapper;
import com.taskmanagement.repository.TaskRepository;
import com.taskmanagement.service.TaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Implementation of {@link TaskService}.
 * Contains all business logic for task management operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;

    /**
     * Default delay in minutes from application.properties.
     * Overridden per-task if the client provides {@code delayMinutes}.
     */
    @Value("${task.scheduler.delay-minutes:2}")
    private int defaultDelayMinutes;

    @Value("${task.scheduler.completion-delay-minutes:5}")
    private int defaultCompletionDelayMinutes;

    // ── CRUD Operations ──────────────────────────────────────────────────────

    /**
     * Creates a new task owned by {@code ownerId}.
     * Sets scheduledStartTime  = now + delayMinutes
     * Sets scheduledCompletionTime = scheduledStartTime + completionDelayMinutes
     */
    @Override
    public TaskResponseDTO createTask(TaskRequestDTO requestDTO, UUID ownerId) {
        log.info("Creating new task with title: {}", requestDTO.getTitle());

        if (ownerId == null) {
            throw new IllegalStateException("Authenticated owner is required to create a task");
        }

        // Title is required on create
        if (requestDTO.getTitle() == null || requestDTO.getTitle().isBlank()) {
            throw new IllegalArgumentException("Title is required and cannot be blank");
        }

        int startDelay = (requestDTO.getDelayMinutes() != null && requestDTO.getDelayMinutes() > 0)
                ? requestDTO.getDelayMinutes()
                : defaultDelayMinutes;

        int completionDelay = (requestDTO.getCompletionDelayMinutes() != null && requestDTO.getCompletionDelayMinutes() > 0)
                ? requestDTO.getCompletionDelayMinutes()
                : defaultCompletionDelayMinutes;

        LocalDateTime scheduledStart      = LocalDateTime.now().plusMinutes(startDelay);
        LocalDateTime scheduledCompletion = scheduledStart.plusMinutes(completionDelay);

        Task task = Task.builder()
                .title(requestDTO.getTitle())
                .description(requestDTO.getDescription())
                .status(TaskStatus.PENDING)
                .priority(requestDTO.getPriority() != null ? requestDTO.getPriority() : TaskPriority.MEDIUM)
                .scheduledStartTime(scheduledStart)
                .scheduledCompletionTime(scheduledCompletion)
                .userId(ownerId)
                .build();

        Task savedTask = taskRepository.save(task);
        log.info("Task created: ID={} | Starts at: {} | Completes at: {}",
                savedTask.getId(), scheduledStart, scheduledCompletion);

        return taskMapper.toResponseDTO(savedTask);
    }

    /**
     * Returns the owner's tasks sorted newest-first.
     */
    @Override
    @Transactional(readOnly = true)
    public List<TaskResponseDTO> getAllTasks(UUID ownerId) {
        log.debug("Fetching tasks for user {}", ownerId);
        List<Task> tasks = taskRepository.findByUserIdOrderByCreatedAtDesc(ownerId);
        return taskMapper.toResponseDTOList(tasks);
    }

    /**
     * Returns a single task by UUID when the caller owns it.
     * Tasks owned by someone else are reported as 404 so their existence is not leaked.
     */
    @Override
    @Transactional(readOnly = true)
    public TaskResponseDTO getTaskById(UUID id, UUID ownerId) {
        log.debug("Fetching task with ID: {}", id);
        Task task = findTaskOrThrow(id, ownerId);
        return taskMapper.toResponseDTO(task);
    }

    /**
     * Updates an existing task's title, description, status, and optional delay.
     */
    @Override
    public TaskResponseDTO updateTask(UUID id, UUID ownerId, TaskRequestDTO requestDTO) {
        log.info("Updating task with ID: {}", id);
        Task task = findTaskOrThrow(id, ownerId);

        // Update fields if provided
        if (requestDTO.getTitle() != null && !requestDTO.getTitle().isBlank()) {
            task.setTitle(requestDTO.getTitle());
        }
        if (requestDTO.getDescription() != null) {
            task.setDescription(requestDTO.getDescription());
        }
        if (requestDTO.getStatus() != null) {
            task.setStatus(requestDTO.getStatus());
        }
        if (requestDTO.getPriority() != null) {
            task.setPriority(requestDTO.getPriority());
        }
        if (requestDTO.getDelayMinutes() != null && requestDTO.getDelayMinutes() > 0) {
            task.setScheduledStartTime(LocalDateTime.now().plusMinutes(requestDTO.getDelayMinutes()));
        }

        Task updatedTask = taskRepository.save(task);
        log.info("Task updated successfully: {}", updatedTask.getId());

        return taskMapper.toResponseDTO(updatedTask);
    }

    /**
     * Deletes a task by UUID (owner only).
     */
    @Override
    public void deleteTask(UUID id, UUID ownerId) {
        log.info("Deleting task with ID: {}", id);
        Task task = findTaskOrThrow(id, ownerId);
        taskRepository.delete(task);
        log.info("Task deleted successfully: {}", id);
    }

    /**
     * Returns the owner's tasks filtered by status.
     */
    @Override
    @Transactional(readOnly = true)
    public List<TaskResponseDTO> getTasksByStatus(TaskStatus status, UUID ownerId) {
        log.debug("Fetching tasks with status: {} for user {}", status, ownerId);
        List<Task> tasks = taskRepository.findByUserIdAndStatus(ownerId, status);
        return taskMapper.toResponseDTOList(tasks);
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Loads a task only when it exists AND belongs to {@code ownerId}.
     * Foreign tasks are reported as not found (no information leak).
     */
    private Task findTaskOrThrow(UUID id, UUID ownerId) {
        return taskRepository.findByIdAndUserId(id, ownerId)
                .orElseThrow(() -> new TaskNotFoundException(id));
    }
}
