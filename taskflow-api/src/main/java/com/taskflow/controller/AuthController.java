package com.taskflow.controller;

import com.taskflow.dto.auth.*;
import com.taskflow.service.AuthService;
import com.taskflow.service.DemoDataSeederService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final DemoDataSeederService demoDataSeederService;

    /* ── POST /api/auth/register ── */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
        @Valid @RequestBody RegisterRequest request) {

        UserResponse user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "message", "Account created successfully. Please sign in.",
            "user",    user
        ));
    }

    /* ── POST /api/auth/login ── */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
        @Valid @RequestBody LoginRequest request) {

        return ResponseEntity.ok(authService.login(request));
    }

    /* ── POST /api/auth/refresh ── */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
        @RequestBody RefreshRequest request) {

        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    /* ── POST /api/auth/demo ── */
    @PostMapping("/demo")
    public ResponseEntity<AuthResponse> demoLogin() {
        return ResponseEntity.ok(demoDataSeederService.loginOrCreateDemoUser());
    }

    /* ── GET /api/auth/me  (requires valid JWT) ── */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(
        @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(authService.me(principal.getUsername()));
    }

    /* ── PUT /api/auth/profile ── */
    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(
        @AuthenticationPrincipal UserDetails principal,
        @Valid @RequestBody UpdateProfileRequest request) {

        return ResponseEntity.ok(authService.updateProfile(principal.getUsername(), request));
    }

    /* ── PUT /api/auth/change-password ── */
    @PutMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
        @AuthenticationPrincipal UserDetails principal,
        @Valid @RequestBody ChangePasswordRequest request) {

        authService.changePassword(principal.getUsername(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    /* ── POST /api/auth/logout  (requires valid JWT) ── */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
        @AuthenticationPrincipal UserDetails principal) {

        authService.logout(principal.getUsername());
        return ResponseEntity.ok(Map.of("message", "Signed out successfully"));
    }
}
