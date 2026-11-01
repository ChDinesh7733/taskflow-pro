package com.taskflow.service;

import com.taskflow.dto.billing.*;
import com.taskflow.entity.Subscription;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.enums.TaskStatus;
import com.taskflow.enums.UserRole;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.PomodoroSessionRepository;
import com.taskflow.repository.SubscriptionRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillingAdminService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final PomodoroSessionRepository pomodoroSessionRepository;
    private final NotificationService notificationService;

    // ── Billing Operations ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SubscriptionResponse getCurrentSubscription(User user) {
        Optional<Subscription> activeSub = subscriptionRepository
                .findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), "ACTIVE");
        if (activeSub.isPresent()) {
            return SubscriptionResponse.from(activeSub.get());
        }

        // Return FREE tier representation
        return new SubscriptionResponse(
                null,
                user.getPlanTier() != null ? user.getPlanTier() : "FREE",
                "ACTIVE",
                "NONE",
                "NONE",
                0,
                "USD",
                null,
                user.getCreatedAt() != null ? user.getCreatedAt() : LocalDateTime.now()
        );
    }

    public List<PlanInfoResponse> getAvailablePlans() {
        return List.of(
                new PlanInfoResponse(
                        "FREE",
                        "Starter",
                        0,
                        "USD",
                        "Essential task management for individuals and small setups",
                        List.of(
                                "Unlimited tasks & custom categories",
                                "NLP Quick Task parser",
                                "Focus Pomodoro timer",
                                "Basic Habit & Streak tracking",
                                "Export tasks to CSV"
                        ),
                        false
                ),
                new PlanInfoResponse(
                        "PRO",
                        "TaskFlow Pro",
                        12,
                        "USD",
                        "Power tools, AI smarts, and unlimited integrations for productivity pros",
                        List.of(
                                "Everything in Starter",
                                "AI Daily Planner & Subtask Breakdown",
                                "Two-way Google Calendar synchronization",
                                "Slack & Discord Realtime Webhooks",
                                "Inbound Email-to-Task Gateway",
                                "Developer REST API Keys & Webhooks",
                                "Priority 24/7 Support"
                        ),
                        true
                ),
                new PlanInfoResponse(
                        "ENTERPRISE",
                        "Enterprise",
                        29,
                        "USD",
                        "Team collaboration, enterprise compliance, and administrative control",
                        List.of(
                                "Everything in Pro",
                                "Real-time Team Presence & Mentions",
                                "Workspace Admin Dashboard & Audit Logs",
                                "Custom Role & Access Permissions",
                                "Dedicated Account Manager",
                                "99.9% Uptime SLA Guarantee"
                        ),
                        false
                )
        );
    }

    @Transactional
    public SubscriptionResponse createCheckoutSession(User user, CheckoutRequest req) {
        String planTier = req.planTier().toUpperCase();
        if ("FREE".equals(planTier)) {
            return cancelSubscription(user);
        }

        int amount = "ENTERPRISE".equals(planTier) ? 29 : 12;

        // Cancel previous active subscriptions
        List<Subscription> existingSubs = subscriptionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        for (Subscription sub : existingSubs) {
            if ("ACTIVE".equalsIgnoreCase(sub.getStatus())) {
                sub.setStatus("CANCELLED");
                subscriptionRepository.save(sub);
            }
        }

        // Create new active subscription
        Subscription subscription = Subscription.builder()
                .user(user)
                .planTier(planTier)
                .status("ACTIVE")
                .provider(req.provider().toUpperCase())
                .paymentMethod(req.paymentMethod().toUpperCase())
                .amount(amount)
                .currency("USD")
                .currentPeriodEnd(LocalDateTime.now().plusMonths(1))
                .build();

        Subscription saved = subscriptionRepository.save(subscription);

        // Update user's plan tier
        user.setPlanTier(planTier);
        userRepository.save(user);

        // Dispatch in-app notification
        try {
            notificationService.sendNotification(
                    user,
                    null,
                    "BILLING",
                    "Welcome to " + planTier + "! Your subscription has been activated successfully."
            );
        } catch (Exception e) {
            log.warn("Failed to send billing notification: {}", e.getMessage());
        }

        log.info("User {} upgraded to plan {}", user.getEmail(), planTier);
        return SubscriptionResponse.from(saved);
    }

    @Transactional
    public SubscriptionResponse cancelSubscription(User user) {
        List<Subscription> existingSubs = subscriptionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        for (Subscription sub : existingSubs) {
            if ("ACTIVE".equalsIgnoreCase(sub.getStatus())) {
                sub.setStatus("CANCELLED");
                subscriptionRepository.save(sub);
            }
        }

        user.setPlanTier("FREE");
        userRepository.save(user);

        try {
            notificationService.sendNotification(
                    user,
                    null,
                    "BILLING",
                    "Your subscription has been cancelled. Your workspace has reverted to the Starter (FREE) tier."
            );
        } catch (Exception e) {
            log.warn("Failed to send billing cancellation notification: {}", e.getMessage());
        }

        log.info("User {} cancelled subscription and reverted to FREE", user.getEmail());
        return new SubscriptionResponse(
                null,
                "FREE",
                "CANCELLED",
                "NONE",
                "NONE",
                0,
                "USD",
                null,
                LocalDateTime.now()
        );
    }

    @Transactional(readOnly = true)
    public String exportTasksCsv(User user) {
        List<Task> tasks = taskRepository.findByOwnerId(user.getId());
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Title,Description,Status,Priority,DueDate,Category,Tags,Assignee,CreatedAt\n");

        for (Task t : tasks) {
            csv.append(escapeCsv(t.getId() != null ? t.getId().toString() : "")).append(",");
            csv.append(escapeCsv(t.getTitle())).append(",");
            csv.append(escapeCsv(t.getDescription())).append(",");
            csv.append(escapeCsv(t.getStatus() != null ? t.getStatus().name() : "")).append(",");
            csv.append(escapeCsv(t.getPriority() != null ? t.getPriority().name() : "")).append(",");
            csv.append(escapeCsv(t.getDueDate() != null ? t.getDueDate().toString() : "")).append(",");
            csv.append(escapeCsv(t.getCategory() != null ? t.getCategory().getName() : "")).append(",");
            csv.append(escapeCsv(t.getTags() != null ? t.getTags() : "")).append(",");
            csv.append(escapeCsv(t.getAssigneeName() != null ? t.getAssigneeName() : "")).append(",");
            csv.append(escapeCsv(t.getCreatedAt() != null ? t.getCreatedAt().toString() : ""));
            csv.append("\n");
        }

        return csv.toString();
    }

    private String escapeCsv(String val) {
        if (val == null) return "\"\"";
        String clean = val.replace("\"", "\"\"");
        return "\"" + clean + "\"";
    }

    // ── Admin Operations ────────────────────────────────────────────────────

    private void ensureAdmin(User adminUser) {
        if (adminUser.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Admin privileges required for this operation");
        }
    }

    @Transactional(readOnly = true)
    public List<AdminUserSummaryResponse> listAllUsersForAdmin(User adminUser) {
        ensureAdmin(adminUser);
        List<User> users = userRepository.findAll();
        List<AdminUserSummaryResponse> list = new ArrayList<>();

        for (User u : users) {
            long taskCount = taskRepository.countByOwnerId(u.getId());
            list.add(AdminUserSummaryResponse.from(u, taskCount));
        }

        // Sort by creation date descending
        list.sort((a, b) -> {
            if (a.createdAt() == null || b.createdAt() == null) return 0;
            return b.createdAt().compareTo(a.createdAt());
        });

        return list;
    }

    @Transactional
    public AdminUserSummaryResponse toggleUserStatus(User adminUser, UUID targetUserId) {
        ensureAdmin(adminUser);
        if (adminUser.getId().equals(targetUserId)) {
            throw new BadRequestException("You cannot disable your own admin account");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", targetUserId));

        target.setEnabled(!target.isEnabled());
        User updated = userRepository.save(target);
        long taskCount = taskRepository.countByOwnerId(updated.getId());

        log.info("Admin {} changed user {} status to enabled={}", adminUser.getEmail(), updated.getEmail(), updated.isEnabled());
        return AdminUserSummaryResponse.from(updated, taskCount);
    }

    @Transactional
    public AdminUserSummaryResponse updateUserRoleAndPlan(User adminUser, UUID targetUserId, UpdateUserRolePlanRequest req) {
        ensureAdmin(adminUser);

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", targetUserId));

        if (req.role() != null) {
            target.setRole(req.role());
        }
        if (req.planTier() != null && !req.planTier().isBlank()) {
            target.setPlanTier(req.planTier().toUpperCase());
        }

        User updated = userRepository.save(target);
        long taskCount = taskRepository.countByOwnerId(updated.getId());

        log.info("Admin {} updated user {} role={} planTier={}",
                adminUser.getEmail(), updated.getEmail(), updated.getRole(), updated.getPlanTier());
        return AdminUserSummaryResponse.from(updated, taskCount);
    }

    @Transactional(readOnly = true)
    public AdminWorkspaceMetricsResponse getWorkspaceMetrics(User adminUser) {
        ensureAdmin(adminUser);

        long totalUsers = userRepository.count();
        long completedTasks = taskRepository.countByStatus(TaskStatus.DONE);
        long activeDeliverables = taskRepository.countByStatusNot(TaskStatus.DONE);
        long totalTasks = completedTasks + activeDeliverables;

        Long mrr = subscriptionRepository.sumActiveSubscriptionAmounts();
        if (mrr == null) mrr = 0L;

        Long pomodoroMinutes = pomodoroSessionRepository.sumAllPomodoroMinutes();
        if (pomodoroMinutes == null) pomodoroMinutes = 0L;

        long activeSubscriptions = subscriptionRepository.countByStatus("ACTIVE");

        return new AdminWorkspaceMetricsResponse(
                totalUsers,
                activeDeliverables,
                completedTasks,
                totalTasks,
                mrr,
                pomodoroMinutes,
                activeSubscriptions
        );
    }
}
