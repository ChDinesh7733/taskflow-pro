package com.taskmanagement.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory, fixed-window rate limiter for authentication endpoints.
 *
 * Deliberately stateless-free (no DB table): a brute-force attacker cannot
 * grow memory indefinitely because entries expire and are pruned on access.
 */
@Service
@Slf4j
public class LoginAttemptService {

    private final int maxAttempts;
    private final Duration window;
    private final Duration lockout;
    private final int maxRegistrationsPerHour;

    /** key → attempt state */
    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(
            @Value("${taskflow.security.login.max-attempts:5}") int maxAttempts,
            @Value("${taskflow.security.login.window-minutes:15}") long windowMinutes,
            @Value("${taskflow.security.login.lockout-minutes:15}") long lockoutMinutes,
            @Value("${taskflow.security.register.max-per-ip-hour:10}") int maxRegistrationsPerHour) {
        this.maxAttempts = maxAttempts;
        this.window = Duration.ofMinutes(windowMinutes);
        this.lockout = Duration.ofMinutes(lockoutMinutes);
        this.maxRegistrationsPerHour = maxRegistrationsPerHour;
    }

    /**
     * Throws {@link RateLimitedException} when the identifier is currently locked out.
     */
    public void checkAllowed(String key) {
        Attempt attempt = attempts.get(normalize(key));
        if (attempt == null) {
            return;
        }
        synchronized (attempt) {
            Instant now = Instant.now();
            if (attempt.lockedUntil != null && now.isBefore(attempt.lockedUntil)) {
                long seconds = Duration.between(now, attempt.lockedUntil).getSeconds() + 1;
                throw new RateLimitedException(seconds);
            }
            if (attempt.lockedUntil != null && now.isAfter(attempt.lockedUntil)) {
                attempts.remove(normalize(key));
            }
        }
    }

    /** Records a failed authentication and locks the key out when the threshold is reached. */
    public void recordFailure(String key) {
        String id = normalize(key);
        prune();
        Attempt attempt = attempts.computeIfAbsent(id, k -> new Attempt());
        synchronized (attempt) {
            Instant now = Instant.now();
            if (attempt.firstFailure == null || Duration.between(attempt.firstFailure, now).compareTo(window) > 0) {
                attempt.firstFailure = now;
                attempt.failures = 0;
                attempt.lockedUntil = null;
            }
            attempt.failures++;
            if (attempt.failures >= maxAttempts) {
                attempt.lockedUntil = now.plus(lockout);
                log.warn("Rate limit triggered for '{}' — locked for {} minutes", id, lockout.toMinutes());
            }
        }
    }

    /** Clears failure state after a successful authentication. */
    public void reset(String key) {
        attempts.remove(normalize(key));
    }

    /** Counts successful registrations from one IP inside the current hour window. */
    public void checkRegistrationAllowed(String ip) {
        String key = "reg:" + ip;
        Attempt attempt = attempts.get(key);
        if (attempt == null) {
            return;
        }
        synchronized (attempt) {
            Instant now = Instant.now();
            if (attempt.firstFailure != null && Duration.between(attempt.firstFailure, now).compareTo(Duration.ofHours(1)) > 0) {
                attempts.remove(key);
                return;
            }
            if (attempt.failures >= maxRegistrationsPerHour) {
                long seconds = Duration.between(now, attempt.firstFailure.plus(Duration.ofHours(1))).getSeconds() + 1;
                throw new RateLimitedException(seconds);
            }
        }
    }

    /** Records one successful registration from an IP. */
    public void recordRegistration(String ip) {
        String key = "reg:" + ip;
        Attempt attempt = attempts.computeIfAbsent(key, k -> new Attempt());
        synchronized (attempt) {
            Instant now = Instant.now();
            if (attempt.firstFailure == null || Duration.between(attempt.firstFailure, now).compareTo(Duration.ofHours(1)) > 0) {
                attempt.firstFailure = now;
                attempt.failures = 0;
            }
            attempt.failures++;
        }
    }

    private void prune() {
        if (attempts.size() < 1000) {
            return;
        }
        Instant cutoff = Instant.now().minus(window).minus(lockout);
        Iterator<Map.Entry<String, Attempt>> it = attempts.entrySet().iterator();
        while (it.hasNext()) {
            Attempt attempt = it.next().getValue();
            synchronized (attempt) {
                if (attempt.firstFailure != null && attempt.firstFailure.isBefore(cutoff) && attempt.lockedUntil == null) {
                    it.remove();
                }
            }
        }
    }

    private static String normalize(String key) {
        return key == null ? "" : key.trim().toLowerCase();
    }

    private static final class Attempt {
        private Instant firstFailure;
        private int failures;
        private Instant lockedUntil;
    }
}
