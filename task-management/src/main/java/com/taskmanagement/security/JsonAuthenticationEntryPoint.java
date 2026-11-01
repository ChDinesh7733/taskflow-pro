package com.taskmanagement.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskmanagement.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.io.IOException;

/**
 * Returns JSON 401 responses instead of a login redirect when an
 * unauthenticated client hits a protected API endpoint.
 */
@Slf4j
@RequiredArgsConstructor
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        if (response.isCommitted()) {
            return;
        }

        // CSRF failures surface for anonymous callers as an AccessDeniedException
        // wrapped inside the authentication exception — report them as 403 so the
        // SPA can refresh its token instead of treating it as an expired session.
        if (hasAccessDeniedCause(authException)) {
            log.debug("CSRF/authorization failure on {} {}", request.getMethod(), request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(objectMapper.writeValueAsString(
                    ApiResponse.error("Request rejected — missing or invalid security token",
                            HttpServletResponse.SC_FORBIDDEN)));
            return;
        }

        log.debug("Unauthenticated access to {} {}", request.getMethod(), request.getRequestURI());
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(
                ApiResponse.error("Authentication required", HttpServletResponse.SC_UNAUTHORIZED)));
    }

    private boolean hasAccessDeniedCause(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof org.springframework.security.access.AccessDeniedException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
