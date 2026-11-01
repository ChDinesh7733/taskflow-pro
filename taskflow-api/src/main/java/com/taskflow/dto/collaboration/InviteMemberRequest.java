package com.taskflow.dto.collaboration;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InviteMemberRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(max = 100) String name,
    String role
) {}
