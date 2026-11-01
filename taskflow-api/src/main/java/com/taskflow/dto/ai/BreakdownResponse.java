package com.taskflow.dto.ai;

import java.util.List;

public record BreakdownResponse(
    String goal,
    List<SubtaskSuggestion> suggestions,
    boolean fromFallback
) {}
