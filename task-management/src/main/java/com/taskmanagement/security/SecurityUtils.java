package com.taskmanagement.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Small helper for reading the authenticated principal safely.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /** Returns the currently authenticated principal, or {@code null} if anonymous. */
    public static AppUserPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return auth.getPrincipal() instanceof AppUserPrincipal principal ? principal : null;
    }

    /** Returns the id of the logged-in user. Throws if there is no authenticated user. */
    public static UUID currentUserId() {
        AppUserPrincipal principal = currentPrincipal();
        if (principal == null) {
            throw new IllegalStateException("No authenticated user in security context");
        }
        return principal.getId();
    }
}
