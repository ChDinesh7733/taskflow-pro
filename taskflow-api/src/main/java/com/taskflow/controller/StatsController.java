package com.taskflow.controller;

import com.taskflow.dto.stats.ProductivityStatsResponse;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.ProductivityStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@Tag(name = "Stats", description = "Productivity statistics")
@SecurityRequirement(name = "bearerAuth")
public class StatsController {

    private final ProductivityStatsService productivityStatsService;
    private final UserRepository           userRepository;

    @GetMapping("/productivity")
    @Operation(summary = "Get productivity stats — on-time rate, streak, overdue count")
    public ProductivityStatsResponse getProductivityStats(
            @AuthenticationPrincipal UserDetails principal) {
        return productivityStatsService.getStats(resolveUser(principal));
    }

    @PutMapping("/settings/digest")
    @Operation(summary = "Toggle email digest on/off")
    public Map<String, Object> toggleDigest(
            @RequestParam boolean enabled,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        user.setEmailDigestEnabled(enabled);
        userRepository.save(user);
        return Map.of("emailDigestEnabled", user.isEmailDigestEnabled());
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
