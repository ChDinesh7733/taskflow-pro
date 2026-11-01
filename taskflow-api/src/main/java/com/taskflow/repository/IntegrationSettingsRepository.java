package com.taskflow.repository;

import com.taskflow.entity.IntegrationSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface IntegrationSettingsRepository extends JpaRepository<IntegrationSettings, UUID> {
    Optional<IntegrationSettings> findByUserId(UUID userId);
    Optional<IntegrationSettings> findByEmailInboundToken(String emailInboundToken);
}
