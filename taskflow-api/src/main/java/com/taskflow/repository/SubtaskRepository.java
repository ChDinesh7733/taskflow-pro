package com.taskflow.repository;

import com.taskflow.entity.Subtask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SubtaskRepository extends JpaRepository<Subtask, UUID> {

    List<Subtask> findByTaskIdOrderByCreatedAtAsc(UUID taskId);

    long countByTaskId(UUID taskId);

    long countByTaskIdAndDoneTrue(UUID taskId);

    @Query("SELECT COUNT(s) = 0 OR SUM(CASE WHEN s.done = false THEN 1 ELSE 0 END) = 0 " +
           "FROM Subtask s WHERE s.task.id = :taskId")
    boolean allDone(@Param("taskId") UUID taskId);

    void deleteByTaskId(UUID taskId);
}
