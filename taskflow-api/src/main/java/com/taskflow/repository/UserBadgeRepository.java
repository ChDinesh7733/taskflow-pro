package com.taskflow.repository;

import com.taskflow.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, UUID> {

    List<UserBadge> findByUserIdOrderByUnlockedAtDesc(UUID userId);

    boolean existsByUserIdAndBadgeKey(UUID userId, String badgeKey);

    Optional<UserBadge> findByUserIdAndBadgeKey(UUID userId, String badgeKey);
}
