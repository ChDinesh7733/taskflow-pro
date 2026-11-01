package com.taskflow.repository;

import com.taskflow.entity.Task;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {

    List<Task> findByOwnerId(UUID ownerId);

    boolean existsByIdAndOwnerId(UUID id, UUID ownerId);

    // ── Filtered page — owner-scoped, eager join avoids N+1 ────────────

    @Query(value = """
        SELECT t FROM Task t
        JOIN FETCH t.owner o
        LEFT JOIN FETCH t.category c
        WHERE t.owner.id = :ownerId
          AND (:status     IS NULL OR t.status   = :status)
          AND (:priority   IS NULL OR t.priority = :priority)
          AND (:categoryId IS NULL OR t.category.id = :categoryId)
          AND (:search     IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%',:search,'%'))
                                   OR LOWER(t.description) LIKE LOWER(CONCAT('%',:search,'%')))
        """,
        countQuery = """
        SELECT COUNT(t) FROM Task t
        WHERE t.owner.id = :ownerId
          AND (:status     IS NULL OR t.status   = :status)
          AND (:priority   IS NULL OR t.priority = :priority)
          AND (:categoryId IS NULL OR t.category.id = :categoryId)
          AND (:search     IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%',:search,'%'))
                                   OR LOWER(t.description) LIKE LOWER(CONCAT('%',:search,'%')))
        """)
    Page<Task> findFiltered(
        @Param("ownerId")    UUID ownerId,
        @Param("status")     TaskStatus status,
        @Param("priority")   TaskPriority priority,
        @Param("categoryId") UUID categoryId,
        @Param("search")     String search,
        Pageable pageable
    );

    // ── Stats — single aggregate query ──────────────────────────────────

    @Query("SELECT t.status, COUNT(t) FROM Task t WHERE t.owner.id = :ownerId GROUP BY t.status")
    List<Object[]> countGroupedByStatus(@Param("ownerId") UUID ownerId);

    // ── Scheduler — find TODO tasks whose startDate has passed ──────────

    @Query("SELECT t FROM Task t WHERE t.status = :todo AND t.startDate IS NOT NULL AND t.startDate <= :today")
    List<Task> findPendingTasksDue(@Param("todo") TaskStatus todo, @Param("today") LocalDate today);

    // ── Notifications — tasks due within next 24h (not DONE) ──────────

    @Query("""
        SELECT t FROM Task t JOIN FETCH t.owner o
        WHERE t.dueDate >= :today
          AND t.dueDate <= :tomorrow
          AND t.status <> com.taskflow.enums.TaskStatus.DONE
          AND t.status <> com.taskflow.enums.TaskStatus.CANCELLED
        """)
    List<Task> findDueSoonTasks(@Param("today") LocalDate today, @Param("tomorrow") LocalDate tomorrow);

    @Query("""
        SELECT t FROM Task t JOIN FETCH t.owner o
        WHERE t.dueDate < :today
          AND t.status <> com.taskflow.enums.TaskStatus.DONE
          AND t.status <> com.taskflow.enums.TaskStatus.CANCELLED
        """)
    List<Task> findOverdueTasks(@Param("today") LocalDate today);

    // ── Productivity stats ──────────────────────────────────────────────

    @Query("""
        SELECT COUNT(t) FROM Task t
        WHERE t.owner.id = :ownerId
          AND t.status = com.taskflow.enums.TaskStatus.DONE
          AND t.completedAt >= :from
        """)
    long countCompletedSince(@Param("ownerId") UUID ownerId, @Param("from") java.time.LocalDateTime from);

    @Query("""
        SELECT COUNT(t) FROM Task t
        WHERE t.owner.id = :ownerId
          AND t.status = com.taskflow.enums.TaskStatus.DONE
          AND t.dueDate IS NOT NULL
          AND t.completedAt IS NOT NULL
          AND CAST(t.completedAt AS localdate) <= t.dueDate
        """)
    long countCompletedOnTime(@Param("ownerId") UUID ownerId);

    @Query("""
        SELECT COUNT(t) FROM Task t
        WHERE t.owner.id = :ownerId
          AND t.dueDate < :today
          AND t.status <> com.taskflow.enums.TaskStatus.DONE
          AND t.status <> com.taskflow.enums.TaskStatus.CANCELLED
        """)
    long countOverdue(@Param("ownerId") UUID ownerId, @Param("today") LocalDate today);

    // Returns completedAt dates for streak calculation (last 30 days)
    @Query("""
        SELECT CAST(t.completedAt AS localdate) FROM Task t
        WHERE t.owner.id = :ownerId
          AND t.status = com.taskflow.enums.TaskStatus.DONE
          AND t.completedAt >= :from
        ORDER BY t.completedAt DESC
        """)
    List<LocalDate> findCompletionDates(@Param("ownerId") UUID ownerId, @Param("from") java.time.LocalDateTime from);

    @Query("""
        SELECT t FROM Task t
        WHERE t.owner.id = :ownerId
          AND t.status = com.taskflow.enums.TaskStatus.DONE
          AND (t.completedAt >= :since OR (t.completedAt IS NULL AND t.updatedAt >= :since))
        ORDER BY t.updatedAt DESC
        """)
    List<Task> findCompletedSince(@Param("ownerId") UUID ownerId, @Param("since") java.time.LocalDateTime since);

    @Query("""
        SELECT t FROM Task t
        WHERE t.owner.id = :ownerId
          AND (
            (t.dueDate < :today AND t.status <> com.taskflow.enums.TaskStatus.DONE AND t.status <> com.taskflow.enums.TaskStatus.CANCELLED)
            OR (t.status = com.taskflow.enums.TaskStatus.CANCELLED AND t.updatedAt >= :since)
          )
        ORDER BY t.dueDate ASC
        """)
    List<Task> findSlippedTasks(@Param("ownerId") UUID ownerId, @Param("today") LocalDate today, @Param("since") java.time.LocalDateTime since);

    @Query("""
        SELECT t FROM Task t
        WHERE t.owner.id = :ownerId
          AND t.status IN (com.taskflow.enums.TaskStatus.TODO, com.taskflow.enums.TaskStatus.IN_PROGRESS, com.taskflow.enums.TaskStatus.IN_REVIEW)
        ORDER BY CASE t.priority
          WHEN com.taskflow.enums.TaskPriority.URGENT THEN 1
          WHEN com.taskflow.enums.TaskPriority.HIGH THEN 2
          WHEN com.taskflow.enums.TaskPriority.MEDIUM THEN 3
          ELSE 4
        END, t.dueDate ASC
        """)
    List<Task> findUpcomingTasks(@Param("ownerId") UUID ownerId);

    // ── Goals / OKRs queries ───────────────────────────────────────────
    long countByGoalId(UUID goalId);

    long countByGoalIdAndStatus(UUID goalId, TaskStatus status);

    List<Task> findByGoalId(UUID goalId);

    // ── Time Blocking queries ──────────────────────────────────────────
    @Query("SELECT t FROM Task t WHERE t.owner.id = :ownerId AND t.timeBlockDate = :date ORDER BY t.timeBlockStart ASC")
    List<Task> findTimeBlockedTasks(@Param("ownerId") UUID ownerId, @Param("date") LocalDate date);

    // ── Admin Workspace Metrics queries ────────────────────────────────
    long countByStatus(TaskStatus status);
    long countByStatusNot(TaskStatus status);
    long countByOwnerId(UUID ownerId);
}
