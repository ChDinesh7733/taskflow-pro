package com.taskflow.dto.task;

import com.taskflow.enums.TaskStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record BulkStatusRequest(
    @NotEmpty List<UUID> taskIds,
    @NotNull TaskStatus status
) {}
