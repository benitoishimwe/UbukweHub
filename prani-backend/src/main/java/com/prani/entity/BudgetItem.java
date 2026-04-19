package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "wedding_budget_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BudgetItem {

    @Id
    @Column(name = "item_id", length = 36)
    private String itemId;

    @Column(name = "plan_id", nullable = false, length = 36)
    private String planId;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "estimated_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    @Column(name = "actual_cost", precision = 12, scale = 2)
    private BigDecimal actualCost;

    @Column(name = "vendor_id", length = 36)
    private String vendorId;

    @Column(nullable = false, length = 20)
    private String status; // planned | booked | paid

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (status == null) status = "planned";
        if (estimatedCost == null) estimatedCost = BigDecimal.ZERO;
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = OffsetDateTime.now(); }
}
