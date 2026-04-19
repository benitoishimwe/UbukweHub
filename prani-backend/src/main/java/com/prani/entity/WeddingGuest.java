package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "wedding_guests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WeddingGuest {

    @Id
    @Column(name = "guest_id", length = 36)
    private String guestId;

    @Column(name = "plan_id", nullable = false, length = 36)
    private String planId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(length = 100)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(name = "rsvp_status", nullable = false, length = 20)
    private String rsvpStatus; // pending | attending | declined

    @Column(name = "meal_choice", length = 50)
    private String mealChoice;

    @Column(name = "dietary_restrictions", columnDefinition = "TEXT")
    private String dietaryRestrictions;

    @Column(name = "table_number")
    private Integer tableNumber;

    @Column(name = "invitation_sent")
    private boolean invitationSent;

    @Column(name = "thank_you_sent")
    private boolean thankYouSent;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (rsvpStatus == null) rsvpStatus = "pending";
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = OffsetDateTime.now(); }
}
