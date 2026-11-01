package com.taskflow.dto.pomodoro;

import java.util.UUID;

public record LogPomodoroRequest(
    UUID taskId,
    Integer durationMinutes,
    String sessionType,
    Boolean interrupted
) {}
