package com.taskflow.dto.integrations;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record InboundEmailRequest(
    String from,
    @NotBlank String subject,
    String body,
    LocalDate dueDate,
    String priority
) {}
