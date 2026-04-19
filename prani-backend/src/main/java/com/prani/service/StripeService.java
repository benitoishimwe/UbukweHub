package com.prani.service;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StripeService {

    @Value("${prani.stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${prani.stripe.webhook-secret}")
    private String webhookSecret;

    @Value("${prani.frontend-url}")
    private String frontendUrl;

    private final SubscriptionService subscriptionService;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    public String createCheckoutSession(String userId, String userEmail, String priceId, String plan) {
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .addLineItem(SessionCreateParams.LineItem.builder()
                    .setPrice(priceId)
                    .setQuantity(1L)
                    .build())
                .setCustomerEmail(userEmail)
                .setSuccessUrl(frontendUrl + "/settings?subscription=success&plan=" + plan)
                .setCancelUrl(frontendUrl + "/pricing?cancelled=true")
                .putMetadata("user_id", userId)
                .putMetadata("plan", plan)
                .build();

            Session session = Session.create(params);
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Stripe checkout session creation failed: {}", e.getMessage());
            throw new RuntimeException("Payment session creation failed");
        }
    }

    public String createPortalSession(String stripeCustomerId) {
        try {
            com.stripe.model.billingportal.Session session =
                com.stripe.model.billingportal.Session.create(
                    com.stripe.param.billingportal.SessionCreateParams.builder()
                        .setCustomer(stripeCustomerId)
                        .setReturnUrl(frontendUrl + "/settings")
                        .build()
                );
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Stripe portal session failed: {}", e.getMessage());
            throw new RuntimeException("Billing portal unavailable");
        }
    }

    public void handleWebhook(String payload, String sigHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("Invalid Stripe webhook signature");
            throw new IllegalArgumentException("Invalid webhook signature");
        }

        log.info("Stripe webhook: {}", event.getType());

        switch (event.getType()) {
            case "checkout.session.completed" -> {
                Session session = (Session) event.getDataObjectDeserializer()
                    .getObject().orElseThrow();
                String userId = session.getMetadata().get("user_id");
                String plan = session.getMetadata().get("plan");
                String stripeSubId = session.getSubscription();
                String stripeCustomerId = session.getCustomer();

                subscriptionService.activateSubscription(
                    userId, plan, stripeSubId, stripeCustomerId,
                    OffsetDateTime.now(), OffsetDateTime.now().plusMonths(1)
                );
                log.info("Activated {} plan for user {}", plan, userId);
            }
            case "invoice.payment_failed" -> {
                // Mark as past_due — handled by subscription service
                log.warn("Payment failed for invoice: {}", event.getId());
            }
            case "customer.subscription.deleted" -> {
                // Downgrade to free
                com.stripe.model.Subscription sub = (com.stripe.model.Subscription)
                    event.getDataObjectDeserializer().getObject().orElseThrow();
                subscriptionService.getActiveSubscription(
                    sub.getMetadata().getOrDefault("user_id", "")
                ).ifPresent(s -> {
                    s.setStatus("cancelled");
                    // This would go through a repository — simplified here
                });
            }
        }
    }
}
