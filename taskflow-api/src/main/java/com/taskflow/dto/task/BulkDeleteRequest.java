package com.taskflow.dto.task;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record BulkDeleteRequest(
    @NotEmpty List<UUID> taskIds
) {}
