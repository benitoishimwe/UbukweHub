package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "wedding_plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WeddingPlan {

    @Id
    @Column(name = "plan_id", length = 36)
    private String planId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "event_id", length = 36)
    private String eventId;

    @Column(name = "wedding_date")
    private LocalDate weddingDate;

    @Column(length = 100)
    private String theme;

    @Column(name = "primary_color", length = 7)
    private String primaryColor;

    @Column(name = "secondary_color", length = 7)
    private String secondaryColor;

    @Column(name = "total_budget", precision = 12, scale = 2)
    private BigDecimal totalBudget;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (primaryColor == null) primaryColor = "#C9A84C";
        if (secondaryColor == null) secondaryColor = "#E8A4B8";
        if (totalBudget == null) totalBudget = BigDecimal.ZERO;
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = OffsetDateTime.now(); }
}
