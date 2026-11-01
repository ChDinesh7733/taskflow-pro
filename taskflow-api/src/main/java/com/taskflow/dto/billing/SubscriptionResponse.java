package com.taskflow.dto.billing;

import com.taskflow.entity.Subscription;
import java.time.LocalDateTime;
import java.util.UUID;

public record SubscriptionResponse(
        UUID id,
        String planTier,
        String status,
        String provider,
        String paymentMethod,
        int amount,
        String currency,
        LocalDateTime currentPeriodEnd,
        LocalDateTime createdAt
) {
    public static SubscriptionResponse from(Subscription s) {
        if (s == null) {
            return new SubscriptionResponse(
                    null,
                    "FREE",
                    "ACTIVE",
                    "NONE",
                    "NONE",
                    0,
                    "USD",
                    null,
                    LocalDateTime.now()
            );
        }
        return new SubscriptionResponse(
                s.getId(),
                s.getPlanTier(),
                s.getStatus(),
                s.getProvider(),
                s.getPaymentMethod(),
                s.getAmount(),
                s.getCurrency(),
                s.getCurrentPeriodEnd(),
                s.getCreatedAt()
        );
    }
}
