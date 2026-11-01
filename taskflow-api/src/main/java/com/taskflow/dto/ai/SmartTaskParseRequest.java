package com.taskflow.dto.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SmartTaskParseRequest(
    @NotBlank(message = "Task description text cannot be blank")
    @Size(max = 1000, message = "Input text cannot exceed 1000 characters")
    String text
) {}
