package com.taskflow.service;

import com.taskflow.dto.pomodoro.LogPomodoroRequest;

import java.util.List;
import java.util.Map;

public interface PomodoroService {
    Map<String, Object> logSession(String userEmail, LogPomodoroRequest req);
    Map<String, Object> getStats(String userEmail);
    List<Map<String, Object>> getRecentSessions(String userEmail);
}
