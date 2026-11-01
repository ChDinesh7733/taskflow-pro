package com.taskflow.repository;

import com.taskflow.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {
    List<ApiKey> findByUserIdAndRevokedFalseOrderByCreatedAtDesc(UUID userId);
    Optional<ApiKey> findByIdAndUserId(UUID id, UUID userId);

    @Query("SELECT k FROM ApiKey k JOIN FETCH k.user WHERE k.keyHash = :keyHash AND k.revoked = false")
    Optional<ApiKey> findByKeyHashWithUser(@Param("keyHash") String keyHash);
}
