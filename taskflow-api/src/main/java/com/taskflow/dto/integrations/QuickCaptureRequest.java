package com.taskflow.dto.integrations;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record QuickCaptureRequest(
    @NotBlank String title,
    String description,
    String priority,
    LocalDate dueDate,
    String tags,
    String url
) {}
