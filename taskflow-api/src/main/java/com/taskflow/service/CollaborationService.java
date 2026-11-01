package com.taskflow.service;

import com.taskflow.dto.collaboration.*;
import com.taskflow.entity.*;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollaborationService {

    private final TeamMemberRepository teamMemberRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final NotificationService notificationService;

    // In-memory presence map: TaskId -> (UserId -> ViewerPresenceResponse)
    private final ConcurrentHashMap<UUID, ConcurrentHashMap<UUID, ViewerPresenceResponse>> presenceMap = new ConcurrentHashMap<>();

    // ── Team Members ──────────────────────────────────────────────────────────

    @Transactional
    public List<TeamMemberResponse> listMembers(User owner) {
        List<TeamMember> members = teamMemberRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId());
        if (members.isEmpty()) {
            // Auto-seed starter team members for realistic SaaS collaboration
            TeamMember m1 = TeamMember.builder()
                    .owner(owner)
                    .name("Alex Rivera")
                    .email("alex.rivera@company.com")
                    .role("ADMIN")
                    .status("ACTIVE")
                    .build();
            TeamMember m2 = TeamMember.builder()
                    .owner(owner)
                    .name("Sarah Chen")
                    .email("sarah.chen@company.com")
                    .role("MEMBER")
                    .status("ACTIVE")
                    .build();
            teamMemberRepository.save(m1);
            teamMemberRepository.save(m2);
            members = teamMemberRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId());
        }
        return members.stream().map(TeamMemberResponse::from).toList();
    }

    @Transactional
    public TeamMemberResponse inviteMember(User owner, InviteMemberRequest req) {
        String email = req.email().trim().toLowerCase();
        Optional<TeamMember> existing = teamMemberRepository.findByOwnerIdAndEmail(owner.getId(), email);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("A team member with email " + email + " already exists in your workspace.");
        }

        // Link with real user if already registered
        User linkedUser = userRepository.findByEmail(email).orElse(null);

        String role = (req.role() != null && req.role().equalsIgnoreCase("ADMIN")) ? "ADMIN" : "MEMBER";

        TeamMember tm = TeamMember.builder()
                .owner(owner)
                .user(linkedUser)
                .email(email)
                .name(req.name().trim())
                .role(role)
                .status("ACTIVE")
                .build();
        TeamMember saved = teamMemberRepository.save(tm);

        // If registered, send notification
        if (linkedUser != null) {
            notificationService.sendNotification(
                    linkedUser,
                    null,
                    "TEAM_INVITE",
                    owner.getDisplayName() + " added you as " + role + " in their TaskFlow workspace."
            );
        }

        return TeamMemberResponse.from(saved);
    }

    @Transactional
    public void removeMember(User owner, UUID memberId) {
        TeamMember tm = teamMemberRepository.findByIdAndOwnerId(memberId, owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("TeamMember", memberId));
        teamMemberRepository.delete(tm);
    }

    @Transactional
    public TeamMemberResponse updateRole(User owner, UUID memberId, String newRole) {
        TeamMember tm = teamMemberRepository.findByIdAndOwnerId(memberId, owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("TeamMember", memberId));
        String role = (newRole != null && newRole.equalsIgnoreCase("ADMIN")) ? "ADMIN" : "MEMBER";
        tm.setRole(role);
        return TeamMemberResponse.from(teamMemberRepository.save(tm));
    }

    // ── Public Project Share Links ────────────────────────────────────────────

    @Transactional
    public ShareLinkResponse generateShareLink(User owner, UUID categoryId) {
        Category cat = categoryRepository.findByIdAndOwnerId(categoryId, owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryId));

        if (cat.getShareToken() == null || cat.getShareToken().isBlank()) {
            cat.setShareToken(UUID.randomUUID().toString().replace("-", ""));
        }
        cat.setIsPublic(true);
        Category saved = categoryRepository.save(cat);

        String shareUrl = "/shared/projects/" + saved.getShareToken();
        return new ShareLinkResponse(saved.getShareToken(), shareUrl, true);
    }

    @Transactional
    public ShareLinkResponse revokeShareLink(User owner, UUID categoryId) {
        Category cat = categoryRepository.findByIdAndOwnerId(categoryId, owner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryId));

        cat.setIsPublic(false);
        Category saved = categoryRepository.save(cat);

        String shareUrl = saved.getShareToken() != null ? "/shared/projects/" + saved.getShareToken() : "";
        return new ShareLinkResponse(saved.getShareToken(), shareUrl, false);
    }

    @Transactional(readOnly = true)
    public PublicProjectResponse getPublicProject(String shareToken) {
        Category cat = categoryRepository.findByShareToken(shareToken)
                .filter(c -> Boolean.TRUE.equals(c.getIsPublic()))
                .orElseThrow(() -> new ResourceNotFoundException("Shared Project", shareToken));

        List<PublicProjectResponse.PublicTaskResponse> taskResponses = cat.getTasks().stream()
                .map(t -> new PublicProjectResponse.PublicTaskResponse(
                        t.getId(),
                        t.getTitle(),
                        t.getDescription(),
                        t.getStatus() != null ? t.getStatus().name() : "TODO",
                        t.getPriority() != null ? t.getPriority().name() : "MEDIUM",
                        t.getDueDate(),
                        t.getSubtasks() != null ? t.getSubtasks().stream().map(Subtask::getTitle).toList() : List.of()
                ))
                .toList();

        return new PublicProjectResponse(
                cat.getId(),
                cat.getName(),
                cat.getColor(),
                cat.getOwner().getDisplayName(),
                LocalDateTime.now(),
                taskResponses
        );
    }

    // ── Live Presence ─────────────────────────────────────────────────────────

    public void recordPresence(UUID taskId, User user) {
        long now = System.currentTimeMillis();
        String avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.getEmail();
        ViewerPresenceResponse viewer = new ViewerPresenceResponse(
                user.getId(),
                user.getDisplayName(),
                user.getEmail(),
                avatar,
                now
        );

        presenceMap.computeIfAbsent(taskId, k -> new ConcurrentHashMap<>()).put(user.getId(), viewer);
    }

    public List<ViewerPresenceResponse> getActiveViewers(UUID taskId) {
        long cutoff = System.currentTimeMillis() - 45_000; // active in last 45 seconds
        ConcurrentHashMap<UUID, ViewerPresenceResponse> map = presenceMap.get(taskId);
        if (map == null || map.isEmpty()) {
            return List.of();
        }

        // Clean up expired entries and return active viewers
        map.entrySet().removeIf(e -> e.getValue().lastSeenEpoch() < cutoff);
        return new ArrayList<>(map.values());
    }

    // ── Audit Activity Log ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AuditActivityResponse> getRecentAuditLog(User owner) {
        return activityLogRepository.findRecentByOwnerId(owner.getId(), PageRequest.of(0, 50))
                .stream()
                .map(AuditActivityResponse::from)
                .toList();
    }
}
