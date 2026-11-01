package com.taskmanagement.repository;

import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Task CRUD operations.
 * Extends JpaRepository to get built-in CRUD + pagination support.
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    /**
     * Find all tasks belonging to a user, newest first.
     */
    List<Task> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Find a task only when it belongs to the given user.
     * Used so one user can never read or mutate another user's task.
     */
    Optional<Task> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Find a user's tasks filtered by status.
     */
    List<Task> findByUserIdAndStatus(UUID userId, TaskStatus status);

    /**
     * Tasks that have no owner yet (created before multi-user ownership).
     * Only used by the startup data migrator.
     */
    List<Task> findByUserIdIsNull();

    /**
     * Find all PENDING tasks whose scheduled start time has passed.
     * Used by the scheduler to auto-transition tasks.
     *
     * @param status          must be PENDING
     * @param currentDateTime the current date-time to compare against
     * @return list of tasks eligible for status transition
     */
    @Query("SELECT t FROM Task t WHERE t.status = :status AND t.scheduledStartTime <= :currentDateTime")
    List<Task> findTasksEligibleForTransition(
            @Param("status") TaskStatus status,
            @Param("currentDateTime") LocalDateTime currentDateTime
    );

    /**
     * Find all IN_PROGRESS tasks whose scheduled completion time has passed.
     *
     * @param status          must be IN_PROGRESS
     * @param currentDateTime the current date-time to compare against
     * @return list of tasks eligible for auto-completion
     */
    @Query("SELECT t FROM Task t WHERE t.status = :status AND t.scheduledCompletionTime <= :currentDateTime")
    List<Task> findTasksEligibleForCompletion(
            @Param("status") TaskStatus status,
            @Param("currentDateTime") LocalDateTime currentDateTime
    );
}
