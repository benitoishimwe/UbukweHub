package com.prani.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Entity
@Table(name = "inventory")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryItem {

    @Id
    @Column(name = "item_id", length = 36)
    private String itemId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category; // furniture | audio | decor | linens | lighting | equipment

    @Column(name = "qr_code", unique = true)
    private String qrCode;

    private String barcode;

    private Integer quantity;
    private Integer available;
    private Integer rented;
    private Integer washing;

    private String condition; // good | fair | poor | maintenance

    @Column(name = "purchase_price")
    private BigDecimal purchasePrice;

    @Column(name = "rental_price")
    private BigDecimal rentalPrice;

    @Type(JsonType.class)
    @Column(name = "photos", columnDefinition = "jsonb")
    private List<String> photos;

    @Column(name = "is_active")
    private Boolean isActive = true;

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
