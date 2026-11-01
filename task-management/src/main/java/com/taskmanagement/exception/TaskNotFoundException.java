package com.taskmanagement.exception;

import java.util.UUID;

/**
 * Thrown when a Task with a given UUID cannot be found in the database.
 */
public class TaskNotFoundException extends RuntimeException {

    private final UUID taskId;

    public TaskNotFoundException(UUID taskId) {
        super("Task not found with ID: " + taskId);
        this.taskId = taskId;
    }

    public UUID getTaskId() {
        return taskId;
    }
}
