package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vendor_favorites",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "vendor_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VendorFavorite {

    @Id
    @Column(name = "favorite_id", length = 36)
    private String favoriteId;

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "vendor_id", length = 36, nullable = false)
    private String vendorId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
