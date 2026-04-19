package com.prani.service;

import com.prani.entity.Subscription;
import com.prani.entity.SubscriptionFeature;
import com.prani.repository.SubscriptionFeatureRepository;
import com.prani.repository.SubscriptionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionFeatureRepository featureRepository;

    @Transactional
    public void createFreeSubscription(String userId) {
        Subscription sub = Subscription.builder()
            .subscriptionId(UUID.randomUUID().toString())
            .userId(userId)
            .plan("free")
            .status("active")
            .cancelAtPeriodEnd(false)
            .build();
        subscriptionRepository.save(sub);
    }

    public Optional<Subscription> getActiveSubscription(String userId) {
        return subscriptionRepository
            .findTopByUserIdAndStatusOrderByCreatedAtDesc(userId, "active")
            .or(() -> subscriptionRepository.findTopByUserIdOrderByCreatedAtDesc(userId));
    }

    public String getCurrentPlan(String userId) {
        return getActiveSubscription(userId)
            .map(Subscription::getPlan)
            .orElse("free");
    }

    public boolean isFeatureEnabled(String userId, String featureKey) {
        String plan = getCurrentPlan(userId);
        return featureRepository.findByPlanAndFeatureKey(plan, featureKey)
            .map(SubscriptionFeature::getIsEnabled)
            .orElse(false);
    }

    public Integer getFeatureLimit(String userId, String featureKey) {
        String plan = getCurrentPlan(userId);
        return featureRepository.findByPlanAndFeatureKey(plan, featureKey)
            .map(SubscriptionFeature::getLimitValue)
            .orElse(0);
    }

    public Map<String, Object> getSubscriptionDetails(String userId) {
        Optional<Subscription> sub = getActiveSubscription(userId);
        String plan = sub.map(Subscription::getPlan).orElse("free");
        List<SubscriptionFeature> features = featureRepository.findByPlan(plan);

        Map<String, Object> featuresMap = new java.util.LinkedHashMap<>();
        for (SubscriptionFeature f : features) {
            featuresMap.put(f.getFeatureKey(), Map.of(
                "enabled", f.getIsEnabled(),
                "limit", f.getLimitValue() != null ? f.getLimitValue() : -1
            ));
        }

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("plan", plan);
        result.put("status", sub.map(Subscription::getStatus).orElse("active"));
        result.put("current_period_end", sub.map(s ->
            s.getCurrentPeriodEnd() != null ? s.getCurrentPeriodEnd().toString() : null)
            .orElse(null));
        result.put("trial_ends_at", sub.map(s ->
            s.getTrialEndsAt() != null ? s.getTrialEndsAt().toString() : null)
            .orElse(null));
        result.put("cancel_at_period_end", sub.map(Subscription::getCancelAtPeriodEnd).orElse(false));
        result.put("features", featuresMap);
        return result;
    }

    @Transactional
    public void activateSubscription(String userId, String plan, String stripeSubId,
                                     String stripeCustomerId, OffsetDateTime periodStart,
                                     OffsetDateTime periodEnd) {
        // Deactivate any existing active sub
        subscriptionRepository.findTopByUserIdAndStatusOrderByCreatedAtDesc(userId, "active")
            .ifPresent(existing -> {
                existing.setStatus("cancelled");
                subscriptionRepository.save(existing);
            });

        Subscription sub = Subscription.builder()
            .subscriptionId(UUID.randomUUID().toString())
            .userId(userId)
            .plan(plan)
            .status("active")
            .stripeSubscriptionId(stripeSubId)
            .stripeCustomerId(stripeCustomerId)
            .currentPeriodStart(periodStart)
            .currentPeriodEnd(periodEnd)
            .cancelAtPeriodEnd(false)
            .build();
        subscriptionRepository.save(sub);
        log.info("Activated {} subscription for user {}", plan, userId);
    }

    @Transactional
    public void cancelSubscription(String userId) {
        subscriptionRepository.findTopByUserIdAndStatusOrderByCreatedAtDesc(userId, "active")
            .ifPresent(sub -> {
                sub.setCancelAtPeriodEnd(true);
                subscriptionRepository.save(sub);
            });
    }

    public Page<Subscription> getAllSubscriptions(Pageable pageable) {
        return subscriptionRepository.findAll(pageable);
    }

    public List<Map<String, Object>> getPlansWithFeatures() {
        String[] plans = {"free", "trial", "pro", "enterprise"};
        List<Map<String, Object>> result = new java.util.ArrayList<>();

        for (String plan : plans) {
            List<SubscriptionFeature> features = featureRepository.findByPlan(plan);
            Map<String, Object> featuresMap = new java.util.LinkedHashMap<>();
            for (SubscriptionFeature f : features) {
                featuresMap.put(f.getFeatureKey(), Map.of(
                    "enabled", f.getIsEnabled(),
                    "limit", f.getLimitValue() != null ? f.getLimitValue() : -1
                ));
            }
            result.add(Map.of("plan", plan, "features", featuresMap));
        }
        return result;
    }
}
