package com.taskmanagement.service.impl;

import com.taskmanagement.dto.RegisterRequestDTO;
import com.taskmanagement.dto.UserResponseDTO;
import com.taskmanagement.entity.User;
import com.taskmanagement.exception.EmailAlreadyExistsException;
import com.taskmanagement.repository.UserRepository;
import com.taskmanagement.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponseDTO register(RegisterRequestDTO request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        // Defense in depth: reject weak/blank passwords even if validation is bypassed.
        String rawPassword = request.getPassword() == null ? "" : request.getPassword();
        if (rawPassword.trim().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .displayName(request.getDisplayName().trim())
                .build();

        User saved = userRepository.save(user);
        log.info("Registered new user: {}", saved.getEmail());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO toResponse(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getDisplayName())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
