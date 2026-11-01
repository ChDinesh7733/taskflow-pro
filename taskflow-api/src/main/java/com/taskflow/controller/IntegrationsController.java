package com.taskflow.controller;

import com.taskflow.dto.integrations.*;
import com.taskflow.dto.task.TaskResponse;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.IntegrationsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations")
@RequiredArgsConstructor
@Tag(name = "Integrations", description = "Google Calendar sync, Inbound Email, Webhooks, API Keys, and Quick Capture")
@SecurityRequirement(name = "bearerAuth")
public class IntegrationsController {

    private final IntegrationsService integrationsService;
    private final UserRepository userRepository;

    @GetMapping("/settings")
    @Operation(summary = "Get workspace integration settings")
    public IntegrationSettingsResponse getSettings(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return integrationsService.getSettingsResponse(user);
    }

    @PutMapping("/settings")
    @Operation(summary = "Update workspace integration settings")
    public IntegrationSettingsResponse updateSettings(
            @Valid @RequestBody UpdateIntegrationSettingsRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return integrationsService.updateSettings(user, req);
    }

    @PostMapping("/gcal/sync")
    @Operation(summary = "Trigger 2-way Google Calendar synchronization")
    public CalendarSyncResponse syncGoogleCalendar(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return integrationsService.syncGoogleCalendar(user);
    }

    @PostMapping("/webhooks/test")
    @Operation(summary = "Dispatch a test alert to a Slack/Discord/Telegram webhook URL")
    public Map<String, Object> testWebhook(
            @Valid @RequestBody WebhookTestRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return integrationsService.testWebhook(user, req);
    }

    @GetMapping("/api-keys")
    @Operation(summary = "List all active API keys")
    public List<ApiKeyResponse> listApiKeys(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return integrationsService.listApiKeys(user);
    }

    @PostMapping("/api-keys")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new API key for browser extensions, cURL, or automation")
    public CreatedApiKeyResponse createApiKey(
            @Valid @RequestBody CreateApiKeyRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return integrationsService.createApiKey(user, req.name());
    }

    @DeleteMapping("/api-keys/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke an API key")
    public void revokeApiKey(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        integrationsService.revokeApiKey(user, id);
    }

    @PostMapping("/quick-capture")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    @Operation(summary = "Quick capture endpoint for browser extension or external API")
    public TaskResponse quickCapture(
            @Valid @RequestBody QuickCaptureRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        Task task = integrationsService.quickCapture(user, req);
        return TaskResponse.from(task);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
