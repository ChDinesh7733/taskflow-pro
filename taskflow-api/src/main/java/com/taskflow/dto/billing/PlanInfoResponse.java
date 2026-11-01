package com.taskflow.dto.billing;

import java.util.List;

public record PlanInfoResponse(
        String id,
        String name,
        int priceMonthly,
        String currency,
        String description,
        List<String> features,
        boolean popular
) {}
