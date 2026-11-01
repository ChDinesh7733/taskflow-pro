package com.taskflow.repository;

import com.taskflow.entity.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    List<ActivityLog> findByTaskIdOrderByCreatedAtDesc(UUID taskId);

    @Query("SELECT a FROM ActivityLog a JOIN a.task t WHERE t.owner.id = :ownerId ORDER BY a.createdAt DESC")
    List<ActivityLog> findRecentByOwnerId(@Param("ownerId") UUID ownerId, Pageable pageable);
}
