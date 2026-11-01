package com.taskflow.service.impl;

import com.taskflow.dto.auth.*;
import com.taskflow.entity.RefreshToken;
import com.taskflow.entity.User;
import com.taskflow.exception.EmailAlreadyExistsException;
import com.taskflow.exception.InvalidTokenException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.RefreshTokenRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.CustomUserDetailsService;
import com.taskflow.security.JwtService;
import com.taskflow.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository        userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JwtService            jwtService;
    private final AuthenticationManager authManager;
    private final CustomUserDetailsService userDetailsService;

    @Value("${jwt.refresh-token-expiry-ms}")
    private long refreshTokenExpiryMs;

    /* ── Register ─────────────────────────────────────────── */
    @Override
    public UserResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        LocalDateTime now = LocalDateTime.now();
        User user = User.builder()
            .email(email)
            .displayName(req.displayName().trim())
            .passwordHash(passwordEncoder.encode(req.password()))
            .role(com.taskflow.enums.UserRole.USER)
            .enabled(true)
            .emailDigestEnabled(true)
            .planTier("FREE")
            .xp(0)
            .level(1)
            .currentStreak(0)
            .longestStreak(0)
            .createdAt(now)
            .updatedAt(now)
            .build();

        User saved = userRepository.save(user);
        log.info("Registered new user: {}", saved.getEmail());
        return UserResponse.from(saved);
    }

    /* ── Login ────────────────────────────────────────────── */
    @Override
    public AuthResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase();

        // Delegates to DaoAuthenticationProvider — throws BadCredentialsException on failure
        authManager.authenticate(
            new UsernamePasswordAuthenticationToken(email, req.password())
        );

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserDetails details = userDetailsService.loadUserByUsername(email);
        String accessToken  = jwtService.generateAccessToken(details);
        String rawRefresh   = UUID.randomUUID().toString();

        // Store hashed refresh token
        RefreshToken rt = RefreshToken.builder()
            .user(user)
            .tokenHash(passwordEncoder.encode(rawRefresh))
            .expiresAt(LocalDateTime.now().plusNanos(refreshTokenExpiryMs * 1_000_000L))
            .build();
        refreshTokenRepository.save(rt);

        log.info("Login successful for {}", email);
        return new AuthResponse(
            accessToken,
            rawRefresh,
            jwtService.getAccessTokenExpiryMs(),
            UserResponse.from(user)
        );
    }

    /* ── Refresh ──────────────────────────────────────────── */
    @Override
    public AuthResponse refresh(String rawToken) {
        // Find a token whose hash matches
        RefreshToken rt = refreshTokenRepository.findAll().stream()
            .filter(t -> passwordEncoder.matches(rawToken, t.getTokenHash()))
            .findFirst()
            .orElseThrow(() -> new InvalidTokenException("Refresh token not found or already used"));

        if (!rt.isValid()) {
            throw new InvalidTokenException("Refresh token has expired or been revoked");
        }

        // Rotate: revoke old, issue new
        rt.setRevoked(true);
        refreshTokenRepository.save(rt);

        User user = rt.getUser();
        UserDetails details = userDetailsService.loadUserByUsername(user.getEmail());
        String newAccess  = jwtService.generateAccessToken(details);
        String newRawRefresh = UUID.randomUUID().toString();

        RefreshToken newRt = RefreshToken.builder()
            .user(user)
            .tokenHash(passwordEncoder.encode(newRawRefresh))
            .expiresAt(LocalDateTime.now().plusNanos(refreshTokenExpiryMs * 1_000_000L))
            .build();
        refreshTokenRepository.save(newRt);

        return new AuthResponse(
            newAccess,
            newRawRefresh,
            jwtService.getAccessTokenExpiryMs(),
            UserResponse.from(user)
        );
    }

    /* ── Me ───────────────────────────────────────────────── */
    @Override
    @Transactional(readOnly = true)
    public UserResponse me(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserResponse.from(user);
    }

    /* ── Update Profile ───────────────────────────────────── */
    @Override
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setDisplayName(request.displayName().trim());
        User saved = userRepository.save(user);
        log.info("Profile updated for {}", email);
        return UserResponse.from(saved);
    }

    /* ── Change Password ──────────────────────────────────── */
    @Override
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("Password changed successfully for {}", email);
    }

    /* ── Logout ───────────────────────────────────────────── */
    @Override
    public void logout(String email) {
        userRepository.findByEmail(email).ifPresent(u ->
            refreshTokenRepository.revokeAllByUserId(u.getId())
        );
        log.info("Logged out: {}", email);
    }
}
