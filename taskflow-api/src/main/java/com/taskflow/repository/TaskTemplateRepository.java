package com.taskflow.repository;

import com.taskflow.entity.TaskTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskTemplateRepository extends JpaRepository<TaskTemplate, UUID> {

    @Query("SELECT t FROM TaskTemplate t WHERE t.user IS NULL OR t.user.id = :userId ORDER BY t.createdAt DESC")
    List<TaskTemplate> findAllAvailableForUser(@Param("userId") UUID userId);
}
