package com.taskflow.scheduler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Pings /api/health every 14 minutes to keep the Render free-tier service awake.
 * Only runs when the SELF_URL environment variable is set — never fires locally.
 */
@Slf4j
@Component
public class KeepAliveScheduler {

    @Value("${self.url:}")
    private String selfUrl;

    private final RestClient restClient = RestClient.create();

    @Scheduled(fixedDelay = 840_000) // 14 minutes in ms (Render sleeps after 15 min)
    public void ping() {
        if (selfUrl == null || selfUrl.isBlank()) {
            return; // env var not set — skip (local dev)
        }
        try {
            String url = selfUrl.stripTrailing() + "/api/health";
            restClient.get().uri(url).retrieve().toBodilessEntity();
            log.debug("[KeepAlive] Pinged {} — service is awake.", url);
        } catch (RestClientException e) {
            log.warn("[KeepAlive] Ping to {} failed: {}", selfUrl, e.getMessage());
        }
    }
}
