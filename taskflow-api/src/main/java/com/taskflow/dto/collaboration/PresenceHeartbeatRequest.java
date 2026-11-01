package com.taskflow.dto.collaboration;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record PresenceHeartbeatRequest(
    @NotNull UUID taskId
) {}
