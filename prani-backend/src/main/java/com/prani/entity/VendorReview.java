package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vendor_reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VendorReview {

    @Id
    @Column(name = "review_id", length = 36)
    private String reviewId;

    @Column(name = "vendor_id", length = 36, nullable = false)
    private String vendorId;

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "event_id")
    private String eventId;

    @Column(nullable = false)
    private Integer rating; // 1-5

    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    // true if user actually hired the vendor (linked to a completed event)
    @Column(name = "is_verified")
    private Boolean isVerified = false;

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
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
