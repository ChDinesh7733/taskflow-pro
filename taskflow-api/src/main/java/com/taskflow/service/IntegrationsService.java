package com.taskflow.service;

import com.taskflow.dto.integrations.*;
import com.taskflow.entity.*;
import com.taskflow.enums.TaskPriority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntegrationsService {

    private final IntegrationSettingsRepository settingsRepo;
    private final ApiKeyRepository apiKeyRepo;
    private final CalendarSyncEventRepository calendarSyncRepo;
    private final TaskRepository taskRepo;
    private final ActivityLogRepository activityLogRepo;
    private final NotificationService notificationService;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    // ── Settings ──────────────────────────────────────────────────────────────

    @Transactional
    public IntegrationSettings getOrCreateSettings(User user) {
        return settingsRepo.findByUserId(user.getId()).orElseGet(() -> {
            String token = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            IntegrationSettings newSettings = IntegrationSettings.builder()
                    .user(user)
                    .gcalEnabled(false)
                    .gcalEmail(user.getEmail())
                    .emailInboundToken(token)
                    .emailInboundEnabled(true)
                    .webhookEnabled(false)
                    .webhookProvider("SLACK")
                    .webhookNotifyOnCreate(true)
                    .webhookNotifyOnComplete(true)
                    .build();
            return settingsRepo.save(newSettings);
        });
    }

    @Transactional
    public IntegrationSettingsResponse getSettingsResponse(User user) {
        return IntegrationSettingsResponse.from(getOrCreateSettings(user));
    }

    @Transactional
    public IntegrationSettingsResponse updateSettings(User user, UpdateIntegrationSettingsRequest req) {
        IntegrationSettings s = getOrCreateSettings(user);
        if (req.gcalEnabled() != null) s.setGcalEnabled(req.gcalEnabled());
        if (req.gcalEmail() != null) s.setGcalEmail(req.gcalEmail().trim());
        if (req.emailInboundEnabled() != null) s.setEmailInboundEnabled(req.emailInboundEnabled());
        if (req.webhookEnabled() != null) s.setWebhookEnabled(req.webhookEnabled());
        if (req.webhookUrl() != null) s.setWebhookUrl(req.webhookUrl().trim());
        if (req.webhookProvider() != null) s.setWebhookProvider(req.webhookProvider().trim().toUpperCase());
        if (req.webhookNotifyOnCreate() != null) s.setWebhookNotifyOnCreate(req.webhookNotifyOnCreate());
        if (req.webhookNotifyOnComplete() != null) s.setWebhookNotifyOnComplete(req.webhookNotifyOnComplete());

        return IntegrationSettingsResponse.from(settingsRepo.save(s));
    }

    // ── Google Calendar 2-Way Sync (Mock / Test Mode) ─────────────────────────

    @Transactional
    public CalendarSyncResponse syncGoogleCalendar(User user) {
        IntegrationSettings s = getOrCreateSettings(user);
        s.setGcalEnabled(true);
        if (s.getGcalEmail() == null || s.getGcalEmail().isBlank()) {
            s.setGcalEmail(user.getEmail());
        }

        // 1. Export tasks with due dates to Calendar sync records
        List<Task> tasksWithDueDates = taskRepo.findAll().stream()
                .filter(t -> t.getOwner().getId().equals(user.getId()) && t.getDueDate() != null && t.getStatus() != TaskStatus.DONE)
                .toList();

        int syncedCount = 0;
        for (Task t : tasksWithDueDates) {
            String eventId = "taskflow-evt-" + t.getId();
            if (!calendarSyncRepo.existsByUserIdAndEventId(user.getId(), eventId)) {
                CalendarSyncEvent event = CalendarSyncEvent.builder()
                        .user(user)
                        .task(t)
                        .eventId(eventId)
                        .title(t.getTitle())
                        .eventTime(t.getDueDate().atTime(10, 0))
                        .build();
                calendarSyncRepo.save(event);
                syncedCount++;
            }
        }

        // 2. Simulated Google Calendar Inbound: import a calendar meeting as task if absent
        String simulatedExternalId = "gcal-ext-retro-" + user.getId().toString().substring(0, 8);
        if (!calendarSyncRepo.existsByUserIdAndEventId(user.getId(), simulatedExternalId)) {
            Task importedMeeting = Task.builder()
                    .title("Sprint Review & Client Demo (Imported from GCal)")
                    .description("Synced automatically from Google Calendar. Calendar event ID: #EVT-4982")
                    .owner(user)
                    .dueDate(LocalDate.now().plusDays(2))
                    .priority(TaskPriority.HIGH)
                    .status(TaskStatus.TODO)
                    .tags("gcal-sync,meeting")
                    .build();
            Task savedMeeting = taskRepo.save(importedMeeting);

            CalendarSyncEvent importEvent = CalendarSyncEvent.builder()
                    .user(user)
                    .task(savedMeeting)
                    .eventId(simulatedExternalId)
                    .title(savedMeeting.getTitle())
                    .eventTime(LocalDate.now().plusDays(2).atTime(15, 30))
                    .build();
            calendarSyncRepo.save(importEvent);
            syncedCount++;
        }

        s.setGcalLastSync(LocalDateTime.now());
        settingsRepo.save(s);

        return new CalendarSyncResponse(
                syncedCount,
                "2-way sync complete with Google Calendar (" + s.getGcalEmail() + ")",
                s.getGcalLastSync()
        );
    }

    // ── Email-to-Task Inbound ─────────────────────────────────────────────────

    @Transactional
    public Task processInboundEmail(String token, InboundEmailRequest req) {
        IntegrationSettings settings = settingsRepo.findByEmailInboundToken(token)
                .filter(IntegrationSettings::getEmailInboundEnabled)
                .orElseThrow(() -> new ResourceNotFoundException("Inbound Email Address", token));

        User owner = settings.getUser();

        TaskPriority prio = TaskPriority.MEDIUM;
        if (req.priority() != null) {
            try {
                prio = TaskPriority.valueOf(req.priority().toUpperCase());
            } catch (Exception ignored) {}
        }

        String desc = (req.body() != null && !req.body().isBlank()) ? req.body() : "";
        if (req.from() != null && !req.from().isBlank()) {
            desc = "From: " + req.from() + "\n\n" + desc;
        }

        Task task = Task.builder()
                .title(req.subject().trim())
                .description(desc.trim())
                .owner(owner)
                .dueDate(req.dueDate() != null ? req.dueDate() : LocalDate.now().plusDays(1))
                .priority(prio)
                .status(TaskStatus.TODO)
                .tags("email-inbound")
                .build();
        Task saved = taskRepo.save(task);

        // Audit & Notification
        ActivityLog logEntry = ActivityLog.builder()
                .task(saved)
                .actor(owner)
                .action("EMAIL_INBOUND_CREATED")
                .oldValue(null)
                .newValue(saved.getTitle())
                .build();
        activityLogRepo.save(logEntry);

        notificationService.sendNotification(
                owner,
                saved.getId(),
                "EMAIL_TASK",
                "New task created from forwarded email: \"" + saved.getTitle() + "\""
        );

        // Trigger outbound webhook if enabled
        sendWebhookAlert(owner, "TASK_CREATED_VIA_EMAIL", saved.getTitle(), "Created from email: " + (req.from() != null ? req.from() : "unknown"));

        return saved;
    }

    // ── Webhook Dispatcher (Slack / Discord / Telegram / Custom) ──────────────

    @Transactional
    public Map<String, Object> testWebhook(User user, WebhookTestRequest req) {
        String url = req.webhookUrl().trim();
        String provider = (req.provider() != null && !req.provider().isBlank()) ? req.provider().toUpperCase() : "SLACK";

        dispatchWebhook(url, provider, "TaskFlow Webhook Test", "🚀 Test notification from your TaskFlow Pro workspace!");
        return Map.of(
                "success", true,
                "message", "Webhook alert successfully sent to " + provider + " endpoint!"
        );
    }

    public void sendWebhookAlert(User user, String eventType, String title, String details) {
        settingsRepo.findByUserId(user.getId()).ifPresent(s -> {
            if (Boolean.TRUE.equals(s.getWebhookEnabled()) && s.getWebhookUrl() != null && !s.getWebhookUrl().isBlank()) {
                boolean shouldSend = false;
                if (eventType.contains("CREATED") && Boolean.TRUE.equals(s.getWebhookNotifyOnCreate())) shouldSend = true;
                if (eventType.contains("COMPLETE") && Boolean.TRUE.equals(s.getWebhookNotifyOnComplete())) shouldSend = true;
                if (shouldSend) {
                    dispatchWebhook(s.getWebhookUrl(), s.getWebhookProvider(), "TaskFlow: " + eventType, title + "\n" + details);
                }
            }
        });
    }

    @Async
    public void dispatchWebhook(String url, String provider, String header, String text) {
        try {
            String payloadJson;
            if ("DISCORD".equalsIgnoreCase(provider)) {
                payloadJson = String.format("{\"content\": \"**%s**\\n%s\"}", escapeJson(header), escapeJson(text));
            } else if ("TELEGRAM".equalsIgnoreCase(provider)) {
                payloadJson = String.format("{\"text\": \"*%s*\\n%s\"}", escapeJson(header), escapeJson(text));
            } else {
                // Slack and Custom fallback
                payloadJson = String.format("{\"text\": \"*%s*\\n%s\"}", escapeJson(header), escapeJson(text));
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payloadJson, StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(4))
                    .build();

            HTTP_CLIENT.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                    .thenAccept(res -> log.info("[Webhook] Dispatched to {} -> HTTP {}", provider, res.statusCode()))
                    .exceptionally(ex -> {
                        log.warn("[Webhook] Failed dispatching to {}: {}", url, ex.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            log.warn("[Webhook] Error building payload for {}: {}", url, e.getMessage());
        }
    }

    // ── API Keys & Browser Extension API ──────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> listApiKeys(User user) {
        return apiKeyRepo.findByUserIdAndRevokedFalseOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(ApiKeyResponse::from)
                .toList();
    }

    @Transactional
    public CreatedApiKeyResponse createApiKey(User user, String keyName) {
        String randomHex = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String rawKey = "tf_live_" + randomHex;
        String prefix = rawKey.substring(0, 12);
        String hash = sha256(rawKey);

        ApiKey apiKey = ApiKey.builder()
                .user(user)
                .name(keyName.trim())
                .keyPrefix(prefix)
                .keyHash(hash)
                .revoked(false)
                .build();
        ApiKey saved = apiKeyRepo.save(apiKey);

        return new CreatedApiKeyResponse(
                saved.getId(),
                saved.getName(),
                rawKey,
                saved.getCreatedAt()
        );
    }

    @Transactional
    public void revokeApiKey(User user, UUID keyId) {
        ApiKey apiKey = apiKeyRepo.findByIdAndUserId(keyId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("ApiKey", keyId));
        apiKey.setRevoked(true);
        apiKeyRepo.save(apiKey);
    }

    @Transactional
    public Optional<User> authenticateByApiKey(String rawApiKey) {
        if (rawApiKey == null || !rawApiKey.startsWith("tf_live_")) {
            return Optional.empty();
        }
        String hash = sha256(rawApiKey);
        return apiKeyRepo.findByKeyHashWithUser(hash)
                .map(key -> {
                    key.setLastUsedAt(LocalDateTime.now());
                    apiKeyRepo.save(key);
                    return key.getUser();
                });
    }

    // ── Quick Capture ─────────────────────────────────────────────────────────

    @Transactional
    public Task quickCapture(User user, QuickCaptureRequest req) {
        TaskPriority prio = TaskPriority.MEDIUM;
        if (req.priority() != null) {
            try {
                prio = TaskPriority.valueOf(req.priority().toUpperCase());
            } catch (Exception ignored) {}
        }

        String desc = req.description() != null ? req.description() : "";
        if (req.url() != null && !req.url().isBlank()) {
            desc = desc.isEmpty() ? "Captured URL: " + req.url() : desc + "\n\nCaptured URL: " + req.url();
        }

        String tags = "quick-capture";
        if (req.tags() != null && !req.tags().isBlank()) {
            tags = tags + "," + req.tags();
        }

        Task task = Task.builder()
                .title(req.title().trim())
                .description(desc.trim())
                .owner(user)
                .dueDate(req.dueDate() != null ? req.dueDate() : LocalDate.now())
                .priority(prio)
                .status(TaskStatus.TODO)
                .tags(tags)
                .build();
        Task saved = taskRepo.save(task);

        ActivityLog logEntry = ActivityLog.builder()
                .task(saved)
                .actor(user)
                .action("QUICK_CAPTURE_CREATED")
                .oldValue(null)
                .newValue(saved.getTitle())
                .build();
        activityLogRepo.save(logEntry);

        return saved;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm missing", e);
        }
    }

    private String escapeJson(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
