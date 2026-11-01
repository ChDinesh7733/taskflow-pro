package com.taskflow.controller;

import com.taskflow.dto.billing.CheckoutRequest;
import com.taskflow.dto.billing.PlanInfoResponse;
import com.taskflow.dto.billing.SubscriptionResponse;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.UserRepository;
import com.taskflow.service.BillingAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Tag(name = "Billing", description = "Subscriptions, Pricing Plans, Simulated Stripe/Razorpay Checkout, and CSV Data Export")
@SecurityRequirement(name = "bearerAuth")
public class BillingController {

    private final BillingAdminService billingService;
    private final UserRepository userRepository;

    @GetMapping("/subscription")
    @Operation(summary = "Get user's current subscription details and plan tier")
    public SubscriptionResponse getSubscription(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return billingService.getCurrentSubscription(user);
    }

    @GetMapping("/plans")
    @Operation(summary = "List all available SaaS pricing plans and feature limits")
    public List<PlanInfoResponse> getPlans() {
        return billingService.getAvailablePlans();
    }

    @PostMapping("/checkout")
    @Operation(summary = "Create checkout session or process simulated instant payment")
    public SubscriptionResponse checkout(
            @Valid @RequestBody CheckoutRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return billingService.createCheckoutSession(user, req);
    }

    @PostMapping("/cancel")
    @Operation(summary = "Cancel active subscription and revert to FREE Starter plan")
    public SubscriptionResponse cancel(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return billingService.cancelSubscription(user);
    }

    @GetMapping("/export/csv")
    @Operation(summary = "Export workspace tasks to CSV format")
    public ResponseEntity<String> exportTasksCsv(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        String csv = billingService.exportTasksCsv(user);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"taskflow-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
