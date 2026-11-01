package com.taskflow.dto.integrations;

import com.taskflow.entity.IntegrationSettings;
import java.time.LocalDateTime;

public record IntegrationSettingsResponse(
    Boolean gcalEnabled,
    String gcalEmail,
    LocalDateTime gcalLastSync,
    String emailInboundAddress,
    Boolean emailInboundEnabled,
    Boolean webhookEnabled,
    String webhookUrl,
    String webhookProvider,
    Boolean webhookNotifyOnCreate,
    Boolean webhookNotifyOnComplete
) {
    public static IntegrationSettingsResponse from(IntegrationSettings s) {
        String inboundEmail = "tasks+" + s.getEmailInboundToken() + "@inbound.taskflow.dev";
        return new IntegrationSettingsResponse(
            s.getGcalEnabled(),
            s.getGcalEmail(),
            s.getGcalLastSync(),
            inboundEmail,
            s.getEmailInboundEnabled(),
            s.getWebhookEnabled(),
            s.getWebhookUrl(),
            s.getWebhookProvider(),
            s.getWebhookNotifyOnCreate(),
            s.getWebhookNotifyOnComplete()
        );
    }
}
