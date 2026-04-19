package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "wedding_menu_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WeddingMenuItem {

    @Id
    @Column(name = "item_id", length = 36)
    private String itemId;

    @Column(name = "plan_id", nullable = false, length = 36)
    private String planId;

    @Column(nullable = false, length = 50)
    private String course; // appetizer | main | dessert | drink

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "dietary_info", length = 100)
    private String dietaryInfo;

    @Column(name = "is_final")
    private boolean isFinal;

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
