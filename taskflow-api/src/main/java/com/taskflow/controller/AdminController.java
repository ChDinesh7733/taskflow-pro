package com.taskflow.controller;

import com.taskflow.dto.billing.AdminUserSummaryResponse;
import com.taskflow.dto.billing.AdminWorkspaceMetricsResponse;
import com.taskflow.dto.billing.UpdateUserRolePlanRequest;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.BillingAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Workspace Administration, User Management, Role/Plan Modification, and SaaS Metrics")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final BillingAdminService adminService;
    private final UserRepository userRepository;

    @GetMapping("/users")
    @Operation(summary = "List all registered workspace users (Admin only)")
    public List<AdminUserSummaryResponse> listUsers(@AuthenticationPrincipal UserDetails principal) {
        User adminUser = resolveUser(principal);
        return adminService.listAllUsersForAdmin(adminUser);
    }

    @PatchMapping("/users/{id}/status")
    @Operation(summary = "Toggle user enabled/disabled status (Admin only)")
    public AdminUserSummaryResponse toggleUserStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        User adminUser = resolveUser(principal);
        return adminService.toggleUserStatus(adminUser, id);
    }

    @PatchMapping("/users/{id}/role-plan")
    @Operation(summary = "Update user role (USER/ADMIN) or plan tier (FREE/PRO/ENTERPRISE) (Admin only)")
    public AdminUserSummaryResponse updateUserRoleAndPlan(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRolePlanRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User adminUser = resolveUser(principal);
        return adminService.updateUserRoleAndPlan(adminUser, id, req);
    }

    @GetMapping("/metrics")
    @Operation(summary = "Get workspace SaaS operational and revenue metrics (Admin only)")
    public AdminWorkspaceMetricsResponse getMetrics(@AuthenticationPrincipal UserDetails principal) {
        User adminUser = resolveUser(principal);
        return adminService.getWorkspaceMetrics(adminUser);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
