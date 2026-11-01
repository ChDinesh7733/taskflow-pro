package com.taskflow.dto.collaboration;

import jakarta.validation.constraints.NotBlank;

public record UpdateRoleRequest(
    @NotBlank String role
) {}
