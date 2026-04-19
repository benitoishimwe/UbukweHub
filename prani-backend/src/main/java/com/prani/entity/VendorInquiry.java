package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vendor_inquiries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VendorInquiry {

    @Id
    @Column(name = "inquiry_id", length = 36)
    private String inquiryId;

    @Column(name = "vendor_id", length = 36, nullable = false)
    private String vendorId;

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "event_id")
    private String eventId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    private BigDecimal budget;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(nullable = false)
    private String status; // pending | responded | closed

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (status == null) status = "pending";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
