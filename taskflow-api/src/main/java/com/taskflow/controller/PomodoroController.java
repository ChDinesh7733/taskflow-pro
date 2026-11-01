package com.taskflow.controller;

import com.taskflow.dto.pomodoro.LogPomodoroRequest;
import com.taskflow.service.PomodoroService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pomodoro")
@RequiredArgsConstructor
@Tag(name = "Pomodoro Timer", description = "Focus session tracking, time logging, and streak calculation")
@SecurityRequirement(name = "bearerAuth")
public class PomodoroController {

    private final PomodoroService pomodoroService;

    @PostMapping("/log")
    @Operation(summary = "Log a completed or stopped Pomodoro focus session")
    public ResponseEntity<Map<String, Object>> logSession(
        @AuthenticationPrincipal UserDetails user,
        @RequestBody LogPomodoroRequest request
    ) {
        Map<String, Object> result = pomodoroService.logSession(user.getUsername(), request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get Pomodoro focus statistics, total minutes, and daily streaks")
    public ResponseEntity<Map<String, Object>> getStats(@AuthenticationPrincipal UserDetails user) {
        Map<String, Object> stats = pomodoroService.getStats(user.getUsername());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/recent")
    @Operation(summary = "Get recent Pomodoro focus sessions for user")
    public ResponseEntity<List<Map<String, Object>>> getRecent(@AuthenticationPrincipal UserDetails user) {
        List<Map<String, Object>> recent = pomodoroService.getRecentSessions(user.getUsername());
        return ResponseEntity.ok(recent);
    }
}
