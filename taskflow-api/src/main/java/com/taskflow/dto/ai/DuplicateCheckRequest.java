package com.taskflow.dto.ai;

import jakarta.validation.constraints.NotBlank;

public record DuplicateCheckRequest(
    @NotBlank String title,
    String description
) {}
