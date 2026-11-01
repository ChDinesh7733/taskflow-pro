package com.taskflow.controller;

import com.taskflow.dto.gamification.BadgeResponse;
import com.taskflow.dto.gamification.GamificationProfileResponse;
import com.taskflow.dto.gamification.LeaderboardEntryResponse;
import com.taskflow.service.GamificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/gamification")
@RequiredArgsConstructor
@Tag(name = "Gamification", description = "XP points, Levels, Badges, Streaks, and Weekly Leaderboard")
@SecurityRequirement(name = "bearerAuth")
public class GamificationController {

    private final GamificationService gamificationService;

    @GetMapping("/profile")
    @Operation(summary = "Get user gamification stats, level tier, badges, and leaderboard")
    public GamificationProfileResponse getProfile(@AuthenticationPrincipal UserDetails user) {
        return gamificationService.getProfile(user.getUsername());
    }

    @GetMapping("/leaderboard")
    @Operation(summary = "Get current weekly team leaderboard rankings")
    public List<LeaderboardEntryResponse> getLeaderboard(@AuthenticationPrincipal UserDetails user) {
        return gamificationService.getProfile(user.getUsername()).leaderboard();
    }

    @GetMapping("/badges")
    @Operation(summary = "Get user badges and achievement progress")
    public List<BadgeResponse> getBadges(@AuthenticationPrincipal UserDetails user) {
        return gamificationService.getProfile(user.getUsername()).badges();
    }
}
