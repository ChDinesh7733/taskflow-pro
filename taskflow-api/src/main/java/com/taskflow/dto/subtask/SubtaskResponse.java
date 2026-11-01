package com.taskflow.dto.subtask;

import java.time.LocalDateTime;
import java.util.UUID;

public record SubtaskResponse(
    UUID id,
    String title,
    boolean done,
    LocalDateTime createdAt
) {}
