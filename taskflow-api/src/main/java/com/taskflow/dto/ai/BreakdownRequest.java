package com.taskflow.dto.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BreakdownRequest(
    @NotBlank @Size(max = 500) String goal
) {}
