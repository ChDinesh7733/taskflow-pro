package com.taskflow.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter.
 * Thread-safe, idempotent; resets on restart (acceptable for dev).
 */
@Service
@Slf4j
public class AiRateLimitService {

    @Value("${ai.rate-limit.requests-per-hour:10}")
    private int maxRequestsPerHour;

    private final ConcurrentHashMap<UUID, Deque<Instant>> windowMap = new ConcurrentHashMap<>();

    /**
     * Returns true if the user is allowed to make another request.
     * Cleans up old entries in the sliding 1-hour window.
     */
    public synchronized boolean isAllowed(UUID userId) {
        Instant cutoff = Instant.now().minusSeconds(3600);
        Deque<Instant> window = windowMap.computeIfAbsent(userId, k -> new ArrayDeque<>());

        // Drop expired timestamps
        while (!window.isEmpty() && window.peekFirst().isBefore(cutoff)) {
            window.pollFirst();
        }

        if (window.size() >= maxRequestsPerHour) {
            log.warn("[AI Rate Limit] User {} exceeded {} req/hr limit", userId, maxRequestsPerHour);
            return false;
        }

        window.addLast(Instant.now());
        return true;
    }

    /** Returns remaining quota for the user (informational). */
    public int remaining(UUID userId) {
        Instant cutoff = Instant.now().minusSeconds(3600);
        Deque<Instant> window = windowMap.getOrDefault(userId, new ArrayDeque<>());
        long recent = window.stream().filter(t -> t.isAfter(cutoff)).count();
        return (int) Math.max(0, maxRequestsPerHour - recent);
    }
}
