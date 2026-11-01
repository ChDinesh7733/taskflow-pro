package com.taskflow.security;

import com.taskflow.entity.User;
import com.taskflow.service.IntegrationsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private final IntegrationsService integrationsService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest  request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain         filterChain
    ) throws ServletException, IOException {

        String apiKey = request.getHeader("X-TaskFlow-API-Key");
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = request.getHeader("X-API-Key");
        }

        if (apiKey != null && apiKey.startsWith("tf_live_") && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                Optional<User> userOpt = integrationsService.authenticateByApiKey(apiKey);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("[API-KEY] Authenticated user {} via API Key", user.getEmail());
                }
            } catch (Exception e) {
                log.warn("[API-KEY] Error validating API key: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
