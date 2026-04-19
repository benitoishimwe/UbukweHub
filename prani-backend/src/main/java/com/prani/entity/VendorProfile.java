package com.prani.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "vendor_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VendorProfile {

    @Id
    @Column(name = "profile_id", length = 36)
    private String profileId;

    @Column(name = "vendor_id", length = 36, nullable = false, unique = true)
    private String vendorId;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String website;
    private String instagram;
    private String facebook;

    @Type(JsonType.class)
    @Column(name = "service_areas", columnDefinition = "jsonb")
    private List<String> serviceAreas;

    @Column(name = "price_min")
    private BigDecimal priceMin;

    @Column(name = "price_max")
    private BigDecimal priceMax;

    private String currency;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<Map<String, Object>> packages;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> availability;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> tags;

    @Column(name = "is_marketplace_active")
    private Boolean isMarketplaceActive = false;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (currency == null) currency = "RWF";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
