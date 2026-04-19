package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Transaction {

    @Id
    @Column(name = "transaction_id", length = 36)
    private String transactionId;

    @Column(nullable = false)
    private String type; // rent | return | wash | buy | lost | damage

    @Column(name = "item_id", length = 36)
    private String itemId;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "event_id")
    private String eventId;

    @Column(name = "event_name")
    private String eventName;

    @Column(name = "staff_id")
    private String staffId;

    @Column(name = "staff_name")
    private String staffName;

    private Integer quantity;

    private String photo;

    @Column(name = "return_date")
    private String returnDate;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
