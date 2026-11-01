package com.taskmanagement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Task entity mapped to the `tasks` table in MySQL.
 * Uses UUID as primary key for distributed-system friendliness.
 *
 * Indexes:
 *  - idx_tasks_status_scheduled: speeds up the scheduler's status-transition query.
 *  - idx_tasks_priority: allows efficient filtering/sorting by priority.
 */
@Entity
@Table(
    name = "tasks",
    indexes = {
        @Index(name = "idx_tasks_status_scheduled", columnList = "status, scheduled_start_time"),
        @Index(name = "idx_tasks_priority",         columnList = "priority"),
        @Index(name = "idx_tasks_user_id",          columnList = "user_id")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    /** Unique identifier for the task (UUID stored as VARCHAR). */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private UUID id;

    /** Title of the task. Required, max 255 chars. */
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /** Detailed description of the task. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Current status of the task.
     * Defaults to PENDING on creation.
     * Auto-transitions to IN_PROGRESS after a delay via scheduler.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private TaskStatus status = TaskStatus.PENDING;

    /** Timestamp indicating when the task was created. */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Timestamp indicating the last update to the task. */
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * The time after which the scheduler will move the task from PENDING to IN_PROGRESS.
     */
    @Column(name = "scheduled_start_time")
    private LocalDateTime scheduledStartTime;

    /**
     * The time after which the scheduler will move the task from IN_PROGRESS to COMPLETED.
     */
    @Column(name = "scheduled_completion_time")
    private LocalDateTime scheduledCompletionTime;

    /**
     * Priority level of the task (LOW, MEDIUM, HIGH).
     * Does NOT affect automatic status transitions.
     * Defaults to MEDIUM.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 10)
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    /**
     * Owner of the task ({@code users.id}).
     *
     * Column is nullable at the database level so existing rows survive the
     * migration; {@code DataInitializer} adopts legacy (NULL) rows into the
     * bootstrap account at startup. Application code always sets this field
     * for newly created tasks.
     */
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "user_id", length = 36)
    private UUID userId;
}
