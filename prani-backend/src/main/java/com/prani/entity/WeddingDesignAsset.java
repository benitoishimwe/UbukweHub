package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "wedding_design_assets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WeddingDesignAsset {

    @Id
    @Column(name = "asset_id", length = 36)
    private String assetId;

    @Column(name = "plan_id", nullable = false, length = 36)
    private String planId;

    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(length = 200)
    private String caption;

    @Column(name = "sort_order")
    private int sortOrder;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
