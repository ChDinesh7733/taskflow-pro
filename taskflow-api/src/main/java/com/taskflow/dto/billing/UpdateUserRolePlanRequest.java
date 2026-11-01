package com.taskflow.dto.billing;

import com.taskflow.enums.UserRole;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UpdateUserRolePlanRequest(
        @NotNull(message = "Role is required")
        UserRole role,

        @Pattern(regexp = "FREE|PRO|ENTERPRISE", message = "Plan tier must be FREE, PRO, or ENTERPRISE")
        String planTier
) {}
