package com.taskflow.repository;

import com.taskflow.entity.CalendarSyncEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CalendarSyncEventRepository extends JpaRepository<CalendarSyncEvent, UUID> {
    List<CalendarSyncEvent> findByUserIdOrderByEventTimeDesc(UUID userId);
    boolean existsByUserIdAndEventId(UUID userId, String eventId);
}
