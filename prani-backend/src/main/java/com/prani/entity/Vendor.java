package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vendors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vendor {

    @Id
    @Column(name = "vendor_id", length = 36)
    private String vendorId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category; // catering | decor | music | photography | transport

    @Column(name = "contact_name")
    private String contactName;

    private String email;
    private String phone;
    private String location;
    private Double rating;

    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
