package com.taskmanagement.controller;

import com.taskmanagement.dto.ApiResponse;
import com.taskmanagement.dto.LoginRequestDTO;
import com.taskmanagement.dto.RegisterRequestDTO;
import com.taskmanagement.dto.UserResponseDTO;
import com.taskmanagement.entity.User;
import com.taskmanagement.repository.UserRepository;
import com.taskmanagement.security.AppUserPrincipal;
import com.taskmanagement.security.LoginAttemptService;
import com.taskmanagement.security.SecurityUtils;
import com.taskmanagement.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Authentication endpoints.
 *
 * POST /api/v1/auth/register  — create account (BCrypt hashed password)
 * POST /api/v1/auth/login     — validate credentials, start server-side session
 * POST /api/v1/auth/logout    — handled by Spring Security's LogoutFilter
 * GET  /api/v1/auth/me        — current session owner (401 when anonymous)
 * GET  /api/v1/auth/csrf      — issues the double-submit CSRF cookie + token
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final LoginAttemptService loginAttemptService;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final CookieCsrfTokenRepository csrfTokenRepository;

    // ── REGISTER ────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponseDTO>> register(
            @Valid @RequestBody RegisterRequestDTO request,
            HttpServletRequest httpRequest) {

        loginAttemptService.checkRegistrationAllowed(clientIp(httpRequest));
        UserResponseDTO user = authService.register(request);
        loginAttemptService.recordRegistration(clientIp(httpRequest));

        log.info("Registration successful for {}", user.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account created — you can now sign in", user, HttpStatus.CREATED.value()));
    }

    // ── LOGIN ───────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserResponseDTO>> login(
            @Valid @RequestBody LoginRequestDTO request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String email = request.getEmail().trim().toLowerCase();

        // Throws 429 (handled globally) when the account is locked out.
        loginAttemptService.checkAllowed(email);

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));

            // Persist the authenticated context into the HTTP session.
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, httpRequest, httpResponse);

            loginAttemptService.reset(email);

            User user = userRepository.findByEmail(email).orElseThrow();
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);

            log.info("Login successful for {}", email);
            return ResponseEntity.ok(
                    ApiResponse.success("Signed in successfully", authService.toResponse(user), HttpStatus.OK.value()));

        } catch (AuthenticationException ex) {
            loginAttemptService.recordFailure(email);
            log.warn("Login failed for {} from {} ({})", email, clientIp(httpRequest),
                    ex.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid email or password", HttpStatus.UNAUTHORIZED.value()));
        }
    }

    // ── CURRENT SESSION ─────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDTO>> me() {
        AppUserPrincipal principal = SecurityUtils.currentPrincipal();
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication required", HttpStatus.UNAUTHORIZED.value()));
        }

        User user = userRepository.findById(principal.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication required", HttpStatus.UNAUTHORIZED.value()));
        }
        return ResponseEntity.ok(
                ApiResponse.success("Session active", authService.toResponse(user), HttpStatus.OK.value()));
    }

    // ── CSRF TOKEN (double-submit cookie for the SPA) ───────────────────────

    @GetMapping("/csrf")
    public ResponseEntity<ApiResponse<Map<String, String>>> csrf(
            HttpServletRequest request,
            HttpServletResponse response) {

        CsrfToken token = csrfTokenRepository.loadToken(request);
        if (token == null) {
            token = csrfTokenRepository.generateToken(request);
        }
        csrfTokenRepository.saveToken(token, request, response);

        return ResponseEntity.ok(ApiResponse.success("CSRF token issued", Map.of(
                "token", token.getToken(),
                "headerName", token.getHeaderName(),
                "paramName", token.getParameterName()), HttpStatus.OK.value()));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // First hop only — safe enough for rate limiting, never used for auth decisions.
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
