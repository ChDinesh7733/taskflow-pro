package com.taskflow.dto.integrations;

import jakarta.validation.constraints.NotBlank;

public record WebhookTestRequest(
    @NotBlank String webhookUrl,
    String provider
) {}
