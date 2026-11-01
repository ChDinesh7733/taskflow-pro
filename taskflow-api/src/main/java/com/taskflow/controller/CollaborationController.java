package com.taskflow.controller;

import com.taskflow.dto.collaboration.*;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.CollaborationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/collaboration")
@RequiredArgsConstructor
@Tag(name = "Collaboration", description = "Team members, roles, project share links, presence, and audit activity")
@SecurityRequirement(name = "bearerAuth")
public class CollaborationController {

    private final CollaborationService collaborationService;
    private final UserRepository userRepository;

    // ── Team Members ──────────────────────────────────────────────────────────

    @GetMapping("/members")
    @Operation(summary = "List team members for the authenticated workspace")
    public List<TeamMemberResponse> listMembers(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return collaborationService.listMembers(user);
    }

    @PostMapping("/members")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Invite a teammate to the workspace")
    public TeamMemberResponse inviteMember(
            @Valid @RequestBody InviteMemberRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return collaborationService.inviteMember(user, req);
    }

    @DeleteMapping("/members/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a team member from workspace")
    public void removeMember(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        collaborationService.removeMember(user, id);
    }

    @PatchMapping("/members/{id}/role")
    @Operation(summary = "Update teammate role (ADMIN or MEMBER)")
    public TeamMemberResponse updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return collaborationService.updateRole(user, id, req.role());
    }

    // ── Project Public Sharing ────────────────────────────────────────────────

    @PostMapping("/projects/{categoryId}/share")
    @Operation(summary = "Generate or enable a public read-only link for a project")
    public ShareLinkResponse shareProject(
            @PathVariable UUID categoryId,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return collaborationService.generateShareLink(user, categoryId);
    }

    @DeleteMapping("/projects/{categoryId}/share")
    @Operation(summary = "Revoke public sharing link for a project")
    public ShareLinkResponse revokeShare(
            @PathVariable UUID categoryId,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return collaborationService.revokeShareLink(user, categoryId);
    }

    // ── Live Presence Indicators ──────────────────────────────────────────────

    @PostMapping("/presence/heartbeat")
    @Operation(summary = "Ping viewer presence for a task and return current viewers")
    public List<ViewerPresenceResponse> pingPresence(
            @Valid @RequestBody PresenceHeartbeatRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        collaborationService.recordPresence(req.taskId(), user);
        return collaborationService.getActiveViewers(req.taskId());
    }

    @GetMapping("/presence/{taskId}")
    @Operation(summary = "Get active viewers for a task")
    public List<ViewerPresenceResponse> getViewers(
            @PathVariable UUID taskId,
            @AuthenticationPrincipal UserDetails principal) {
        return collaborationService.getActiveViewers(taskId);
    }

    // ── Audit Activity Log ────────────────────────────────────────────────────

    @GetMapping("/activity-log")
    @Operation(summary = "Get recent audit activity across workspace tasks")
    public List<AuditActivityResponse> getAuditLog(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return collaborationService.getRecentAuditLog(user);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
