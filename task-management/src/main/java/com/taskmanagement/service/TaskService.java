package com.taskmanagement.service;

import com.taskmanagement.dto.TaskRequestDTO;
import com.taskmanagement.dto.TaskResponseDTO;
import com.taskmanagement.entity.TaskStatus;

import java.util.List;
import java.util.UUID;

/**
 * Service interface defining all business operations for Tasks.
 */
public interface TaskService {

    /**
     * Creates a new task with PENDING status and sets its scheduled start time.
     *
     * @param requestDTO the task creation payload
     * @return the created task as a response DTO
     */
    TaskResponseDTO createTask(TaskRequestDTO requestDTO, UUID ownerId);

    /**
     * Retrieves all tasks sorted by creation date (latest first).
     *
     * @return list of all task response DTOs
     */
    List<TaskResponseDTO> getAllTasks(UUID ownerId);

    /**
     * Retrieves a single task by its UUID.
     *
     * @param id the UUID of the task
     * @return the task response DTO
     * @throws com.taskmanagement.exception.TaskNotFoundException if not found
     */
    TaskResponseDTO getTaskById(UUID id, UUID ownerId);

    /**
     * Updates an existing task's title, description, and/or status.
     *
     * @param id         the UUID of the task to update
     * @param requestDTO the update payload
     * @return the updated task as a response DTO
     * @throws com.taskmanagement.exception.TaskNotFoundException if not found
     */
    TaskResponseDTO updateTask(UUID id, UUID ownerId, TaskRequestDTO requestDTO);

    /**
     * Deletes a task by its UUID.
     *
     * @param id the UUID of the task to delete
     * @throws com.taskmanagement.exception.TaskNotFoundException if not found
     */
    void deleteTask(UUID id, UUID ownerId);

    /**
     * Retrieves all tasks filtered by status.
     *
     * @param status the status to filter by
     * @return filtered list of task response DTOs
     */
    List<TaskResponseDTO> getTasksByStatus(TaskStatus status, UUID ownerId);
}
