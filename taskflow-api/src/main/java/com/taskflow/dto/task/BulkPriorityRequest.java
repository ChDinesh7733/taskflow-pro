package com.taskflow.dto.task;

import com.taskflow.enums.TaskPriority;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record BulkPriorityRequest(
    @NotEmpty List<UUID> taskIds,
    @NotNull TaskPriority priority
) {}
