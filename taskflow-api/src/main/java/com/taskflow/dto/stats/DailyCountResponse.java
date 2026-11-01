package com.taskflow.dto.stats;

import java.time.LocalDate;

public record DailyCountResponse(
    LocalDate date,
    long count
) {}
