package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "subscription_features")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SubscriptionFeature {

    @Id
    @Column(name = "feature_id", length = 36)
    private String featureId;

    @Column(nullable = false)
    private String plan; // free | trial | pro | enterprise

    @Column(name = "feature_key", nullable = false)
    private String featureKey; // ai_assistant | save_the_date | vendor_marketplace | analytics | unlimited_events

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled;

    // NULL = unlimited, >0 = capped usage per month
    @Column(name = "limit_value")
    private Integer limitValue;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
