package com.taskmanagement.service;

import com.taskmanagement.dto.RegisterRequestDTO;
import com.taskmanagement.dto.UserResponseDTO;
import com.taskmanagement.entity.User;

/**
 * Authentication-related business logic (account creation only —
 * credential validation is delegated to Spring Security's AuthenticationManager).
 */
public interface AuthService {

    UserResponseDTO register(RegisterRequestDTO request);

    UserResponseDTO toResponse(User user);
}
