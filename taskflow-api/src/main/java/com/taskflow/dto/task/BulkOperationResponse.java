package com.taskflow.dto.task;

public record BulkOperationResponse(
    int affectedCount,
    String message
) {}
