package com.taskflow.dto.ai;

import com.taskflow.enums.TaskPriority;
import java.time.LocalDate;

public record SmartTaskParseResponse(
    String title,
    String description,
    LocalDate dueDate,
    TaskPriority priority,
    String tags,
    String rawInput
) {}
