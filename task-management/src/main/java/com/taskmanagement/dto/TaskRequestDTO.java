package com.taskmanagement.dto;

import com.taskmanagement.entity.TaskPriority;
import com.taskmanagement.entity.TaskStatus;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO (Data Transfer Object) used when creating or updating a Task.
 * Carries only the fields the client is allowed to set directly.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskRequestDTO {

    /** Title of the task. Required on create, optional on update. */
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    /** Optional description for the task. */
    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    /**
     * Optional initial status. If omitted, defaults to PENDING.
     * Clients can set this to COMPLETED directly on creation/update.
     */
    private TaskStatus status;

    /**
     * Priority of the task (LOW, MEDIUM, HIGH).
     * Defaults to MEDIUM if not provided.
     */
    private TaskPriority priority;

    /**
     * Delay in minutes after which PENDING → IN_PROGRESS. Defaults to 2.
     */
    private Integer delayMinutes;

    /**
     * Delay in minutes after which IN_PROGRESS → COMPLETED. Defaults to 5.
     */
    private Integer completionDelayMinutes;
}
