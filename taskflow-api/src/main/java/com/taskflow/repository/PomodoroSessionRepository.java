package com.taskflow.repository;

import com.taskflow.entity.PomodoroSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PomodoroSessionRepository extends JpaRepository<PomodoroSession, UUID> {

    List<PomodoroSession> findByUserIdOrderByStartedAtDesc(UUID userId);

    List<PomodoroSession> findByTaskIdOrderByStartedAtDesc(UUID taskId);

    @Query("SELECT COALESCE(SUM(p.durationMinutes), 0) FROM PomodoroSession p WHERE p.user.id = :userId AND p.interrupted = false")
    int sumTotalMinutesByUser(@Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(p.durationMinutes), 0) FROM PomodoroSession p WHERE p.user.id = :userId AND p.startedAt >= :since AND p.interrupted = false")
    int sumMinutesByUserSince(@Param("userId") UUID userId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(p) FROM PomodoroSession p WHERE p.user.id = :userId AND p.interrupted = false")
    long countCompletedByUser(@Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(p.durationMinutes), 0) FROM PomodoroSession p WHERE p.interrupted = false")
    Long sumAllPomodoroMinutes();
}
