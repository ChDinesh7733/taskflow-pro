package com.taskflow.dto.integrations;

public record UpdateIntegrationSettingsRequest(
    Boolean gcalEnabled,
    String gcalEmail,
    Boolean emailInboundEnabled,
    Boolean webhookEnabled,
    String webhookUrl,
    String webhookProvider,
    Boolean webhookNotifyOnCreate,
    Boolean webhookNotifyOnComplete
) {}
