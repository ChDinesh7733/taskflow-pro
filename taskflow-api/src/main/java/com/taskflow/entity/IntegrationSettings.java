package com.taskflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "integration_settings",
    indexes = {
        @Index(name = "idx_is_user_id", columnList = "user_id"),
        @Index(name = "idx_is_email_token", columnList = "email_inbound_token")
    }
)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class IntegrationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "gcal_enabled", nullable = false)
    @Builder.Default
    private Boolean gcalEnabled = false;

    @Column(name = "gcal_email", length = 255)
    private String gcalEmail;

    @Column(name = "gcal_last_sync")
    private LocalDateTime gcalLastSync;

    @Column(name = "email_inbound_token", length = 64, unique = true)
    private String emailInboundToken;

    @Column(name = "email_inbound_enabled", nullable = false)
    @Builder.Default
    private Boolean emailInboundEnabled = true;

    @Column(name = "webhook_enabled", nullable = false)
    @Builder.Default
    private Boolean webhookEnabled = false;

    @Column(name = "webhook_url", length = 500)
    private String webhookUrl;

    @Column(name = "webhook_provider", nullable = false, length = 50)
    @Builder.Default
    private String webhookProvider = "SLACK"; // SLACK, DISCORD, TELEGRAM, CUSTOM

    @Column(name = "webhook_notify_on_create", nullable = false)
    @Builder.Default
    private Boolean webhookNotifyOnCreate = true;

    @Column(name = "webhook_notify_on_complete", nullable = false)
    @Builder.Default
    private Boolean webhookNotifyOnComplete = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
