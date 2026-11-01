package com.taskflow.dto.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CheckoutRequest(
        @NotBlank(message = "Plan tier is required")
        @Pattern(regexp = "FREE|PRO|ENTERPRISE", message = "Plan tier must be FREE, PRO, or ENTERPRISE")
        String planTier,

        @NotBlank(message = "Provider is required")
        @Pattern(regexp = "STRIPE|RAZORPAY", message = "Provider must be STRIPE or RAZORPAY")
        String provider,

        @NotBlank(message = "Payment method is required")
        @Pattern(regexp = "CARD|UPI|NETBANKING", message = "Payment method must be CARD, UPI, or NETBANKING")
        String paymentMethod
) {}
