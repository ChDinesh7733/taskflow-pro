package com.taskflow.repository;

import com.taskflow.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {
    List<TeamMember> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);
    Optional<TeamMember> findByOwnerIdAndEmail(UUID ownerId, String email);
    Optional<TeamMember> findByIdAndOwnerId(UUID id, UUID ownerId);
    long countByOwnerId(UUID ownerId);
}
