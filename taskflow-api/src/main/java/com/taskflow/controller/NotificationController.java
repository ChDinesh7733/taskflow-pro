package com.taskflow.controller;

import com.taskflow.dto.notification.NotificationResponse;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.EmailDigestService;
import com.taskflow.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "In-app notifications and email digest")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;
    private final EmailDigestService  emailDigestService;
    private final UserRepository      userRepository;

    @GetMapping
    @Operation(summary = "Get all notifications for the current user")
    public List<NotificationResponse> getNotifications(
            @AuthenticationPrincipal UserDetails principal) {
        return notificationService.getNotifications(resolveUser(principal));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread notification count")
    public Map<String, Long> getUnreadCount(
            @AuthenticationPrincipal UserDetails principal) {
        return Map.of("count", notificationService.getUnreadCount(resolveUser(principal)));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public NotificationResponse markRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return notificationService.markRead(id, resolveUser(principal));
    }

    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark all notifications as read")
    public void markAllRead(@AuthenticationPrincipal UserDetails principal) {
        notificationService.markAllRead(resolveUser(principal));
    }

    @PostMapping("/test-digest")
    @Operation(summary = "Trigger a test email digest immediately")
    public Map<String, String> testDigest(@AuthenticationPrincipal UserDetails principal) {
        emailDigestService.sendTestDigest(resolveUser(principal));
        return Map.of("message", "Test digest sent — check Mailtrap inbox");
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
