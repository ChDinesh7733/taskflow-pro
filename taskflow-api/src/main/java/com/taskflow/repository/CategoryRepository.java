package com.taskflow.repository;

import com.taskflow.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByOwnerId(UUID ownerId);
    Optional<Category> findByIdAndOwnerId(UUID id, UUID ownerId);
    Optional<Category> findByShareToken(String shareToken);
}
