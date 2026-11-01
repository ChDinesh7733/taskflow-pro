package com.taskflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Publishes real-time task events to the authenticated user's private STOMP topic.
 * Topic: /user/{email}/queue/tasks
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TaskEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishTaskCreated(String userEmail, Object taskPayload) {
        publish(userEmail, "CREATED", taskPayload);
    }

    public void publishTaskUpdated(String userEmail, Object taskPayload) {
        publish(userEmail, "UPDATED", taskPayload);
    }

    public void publishTaskDeleted(String userEmail, String taskId) {
        publish(userEmail, "DELETED", Map.of("id", taskId));
    }

    public void publishStatusChanged(String userEmail, Object taskPayload) {
        publish(userEmail, "STATUS_CHANGED", taskPayload);
    }

    private void publish(String userEmail, String eventType, Object payload) {
        Map<String, Object> envelope = Map.of(
            "event",   eventType,
            "payload", payload
        );
        messagingTemplate.convertAndSendToUser(userEmail, "/queue/tasks", envelope);
        log.debug("[WS] Published {} event to user {}", eventType, userEmail);
    }
}
