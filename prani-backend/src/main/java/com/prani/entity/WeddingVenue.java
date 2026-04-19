package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "wedding_venues")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WeddingVenue {

    @Id
    @Column(name = "venue_id", length = 36)
    private String venueId;

    @Column(name = "plan_id", nullable = false, length = 36)
    private String planId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    private Integer capacity;

    @Column(name = "rental_fee", precision = 12, scale = 2)
    private BigDecimal rentalFee;

    @Column(name = "included_items", columnDefinition = "TEXT")
    private String includedItems;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_selected")
    private boolean isSelected;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = OffsetDateTime.now(); }
}
