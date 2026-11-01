package com.taskflow.dto.ai;

import java.util.UUID;

public record DuplicateCheckResponse(
    boolean isDuplicate,
    double similarityScore,
    UUID similarTaskId,
    String similarTaskTitle,
    String similarTaskStatus,
    String warningMessage
) {}
