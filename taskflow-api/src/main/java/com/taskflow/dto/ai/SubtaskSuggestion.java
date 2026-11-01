package com.taskflow.dto.ai;

public record SubtaskSuggestion(
    String title,
    String priority,   // HIGH | MEDIUM | LOW
    int    dueInDays
) {}
