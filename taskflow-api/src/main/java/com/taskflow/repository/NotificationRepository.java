package com.taskflow.repository;

import com.taskflow.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndReadFalse(UUID userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId")
    void markAllReadByUserId(@Param("userId") UUID userId);

    // idempotency check — don't duplicate DUE_SOON/OVERDUE for same task+type in last 24h
    @Query("""
        SELECT COUNT(n) > 0 FROM Notification n
        WHERE n.taskId = :taskId
          AND n.type   = :type
          AND n.createdAt >= :since
        """)
    boolean existsRecentForTask(@Param("taskId") UUID taskId,
                                @Param("type")   String type,
                                @Param("since")  LocalDateTime since);
}
