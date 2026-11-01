package com.taskflow.service;

import com.taskflow.entity.User;
import com.taskflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailDigestService {

    private final JavaMailSender     mailSender;
    private final UserRepository     userRepository;
    private final NotificationService notificationService;

    @Value("${app.mail.from:noreply@taskflow.dev}")
    private String fromAddress;

    /**
     * Daily 8 AM digest — sends a summary of unread notifications to each user
     * who has email digest enabled.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional(readOnly = true)
    public void sendDailyDigests() {
        List<User> subscribers = userRepository.findByEmailDigestEnabledTrue();
        log.info("[EmailDigest] Sending daily digest to {} subscribers", subscribers.size());

        for (User user : subscribers) {
            try {
                sendDigest(user);
            } catch (Exception e) {
                log.error("[EmailDigest] Failed to send to {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    public void sendDigest(User user) {
        long unreadCount = notificationService.getUnreadCount(user);
        if (unreadCount == 0) return;     // nothing to report

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(user.getEmail());
        msg.setSubject("📋 TaskFlow Daily Digest — " + unreadCount + " update(s) waiting");
        msg.setText(buildBody(user, unreadCount));
        mailSender.send(msg);

        log.info("[EmailDigest] Sent digest to {} ({} notifications)", user.getEmail(), unreadCount);
    }

    // ── Manual test trigger via endpoint ────────────────────
    public void sendTestDigest(User user) {
        sendDigest(user);
    }

    // ── Private helpers ─────────────────────────────────────

    private String buildBody(User user, long unreadCount) {
        return """
            Hi %s,

            You have %d unread notification(s) in TaskFlow.

            👉 Open the app to see your tasks:
               http://localhost:5173

            ────────────────────────────────────
            Tips for today:
            • Check tasks due today and mark them done
            • Review any overdue tasks and reschedule if needed
            • Break large goals down using the AI Breakdown feature

            To unsubscribe from this digest, go to Settings → Email Digest → Off.

            — The TaskFlow Team
            """.formatted(user.getDisplayName(), unreadCount);
    }
}
