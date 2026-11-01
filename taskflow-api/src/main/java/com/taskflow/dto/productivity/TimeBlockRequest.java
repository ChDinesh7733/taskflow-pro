package com.taskflow.dto.productivity;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record TimeBlockRequest(
    @NotNull(message = "Date is required")
    LocalDate date,
    @NotNull(message = "Start time is required")
    String startTime, // e.g. "09:00"
    @NotNull(message = "End time is required")
    String endTime    // e.g. "10:30"
) {}
