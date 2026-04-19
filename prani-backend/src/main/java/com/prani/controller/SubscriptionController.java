package com.prani.controller;

import com.prani.security.PraniAuthPrincipal;
import com.prani.service.StripeService;
import com.prani.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final StripeService stripeService;

    @Value("${prani.stripe.price-ids.pro-monthly:}")
    private String proPriceId;

    @Value("${prani.stripe.price-ids.enterprise-monthly:}")
    private String enterprisePriceId;

    @GetMapping("/plans")
    public ResponseEntity<?> plans() {
        return ResponseEntity.ok(subscriptionService.getPlansWithFeatures());
    }

    @GetMapping("/current")
    public ResponseEntity<?> current(@AuthenticationPrincipal PraniAuthPrincipal principal) {
        return ResponseEntity.ok(subscriptionService.getSubscriptionDetails(principal.getUserId()));
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        String plan = body.get("plan");
        String priceId = "enterprise".equals(plan) ? enterprisePriceId : proPriceId;
        String url = stripeService.createCheckoutSession(
            principal.getUserId(), principal.getEmail(), priceId, plan
        );
        return ResponseEntity.ok(Map.of("checkout_url", url));
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(@AuthenticationPrincipal PraniAuthPrincipal principal) {
        subscriptionService.cancelSubscription(principal.getUserId());
        return ResponseEntity.ok(Map.of("message", "Subscription will cancel at period end"));
    }

    @GetMapping("/portal")
    public ResponseEntity<?> portal(@AuthenticationPrincipal PraniAuthPrincipal principal) {
        String customerId = subscriptionService.getActiveSubscription(principal.getUserId())
            .map(s -> s.getStripeCustomerId())
            .orElseThrow(() -> new IllegalStateException("No Stripe customer found"));
        String url = stripeService.createPortalSession(customerId);
        return ResponseEntity.ok(Map.of("portal_url", url));
    }
}
