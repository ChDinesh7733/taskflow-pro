package com.taskmanagement.dto;

import com.taskmanagement.entity.TaskPriority;
import com.taskmanagement.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO returned in API responses for Task data.
 * Maps the Task entity fields to a clean JSON response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponseDTO {

    /** Unique UUID identifier of the task. */
    private UUID id;

    /** Title of the task. */
    private String title;

    /** Description of the task. */
    private String description;

    /** Current status: PENDING, IN_PROGRESS, or COMPLETED. */
    private TaskStatus status;

    /** Priority of the task: LOW, MEDIUM, or HIGH. */
    private TaskPriority priority;

    /** When the task was created. */
    private LocalDateTime createdAt;

    /** When the task was last updated. */
    private LocalDateTime updatedAt;

    /** The scheduled time for auto-transition to IN_PROGRESS. */
    private LocalDateTime scheduledStartTime;

    /** The scheduled time for auto-transition to COMPLETED. */
    private LocalDateTime scheduledCompletionTime;
}
