package com.taskflow.dto.productivity;

import jakarta.validation.constraints.NotBlank;

public record CreateTemplateRequest(
    @NotBlank(message = "Template title is required")
    String title,
    String description,
    String category,
    @NotBlank(message = "Template tasks definition is required")
    String tasksJson
) {}
