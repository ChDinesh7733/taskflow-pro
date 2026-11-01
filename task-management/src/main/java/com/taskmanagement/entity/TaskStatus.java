package com.taskmanagement.entity;

/**
 * Enum representing the possible statuses of a Task.
 *
 * PENDING     - Task is created but not yet started
 * IN_PROGRESS - Task has been auto-transitioned after a delay
 * COMPLETED   - Task has been marked as completed
 */
public enum TaskStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED
}
