package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vendor_portfolio")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VendorPortfolio {

    @Id
    @Column(name = "portfolio_id", length = 36)
    private String portfolioId;

    @Column(name = "vendor_id", length = 36, nullable = false)
    private String vendorId;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    private String caption;

    @Column(name = "event_type")
    private String eventType;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Column(name = "uploaded_at")
    private OffsetDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = OffsetDateTime.now();
    }
}
