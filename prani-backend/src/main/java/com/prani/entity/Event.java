package com.prani.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Event {

    @Id
    @Column(name = "event_id", length = 36)
    private String eventId;

    @Column(nullable = false)
    private String name;

    @Column(name = "event_date")
    private String eventDate; // dd/mm/yyyy format (preserved from Python)

    private String venue;

    @Column(name = "client_id")
    private String clientId;

    @Column(name = "client_name")
    private String clientName;

    @Type(JsonType.class)
    @Column(name = "staff_ids", columnDefinition = "jsonb")
    private List<String> staffIds;

    @Type(JsonType.class)
    @Column(name = "vendor_ids", columnDefinition = "jsonb")
    private List<String> vendorIds;

    @Column(nullable = false)
    private String status; // planning | active | completed | cancelled

    private Double budget;

    @Column(name = "guest_count")
    private Integer guestCount;

    @Column(name = "greatness_score")
    private Double greatnessScore;

    // Alias getter to avoid typo issues in service layer
    public Double getGreatnesScore() { return greatnessScore; }
    public void setGreatnesScore(Double v) { this.greatnessScore = v; }

    private String notes;

    // Prani expansion fields
    @Column(name = "event_type_slug")
    private String eventTypeSlug; // wedding | corporate | birthday | conference | private_party

    @Type(JsonType.class)
    @Column(name = "checklist", columnDefinition = "jsonb")
    private List<Map<String, Object>> checklist;

    @Type(JsonType.class)
    @Column(name = "timeline", columnDefinition = "jsonb")
    private List<Map<String, Object>> timeline;

    @Type(JsonType.class)
    @Column(name = "seating_plan", columnDefinition = "jsonb")
    private Map<String, Object> seatingPlan;

    @Type(JsonType.class)
    @Column(name = "guest_list", columnDefinition = "jsonb")
    private List<Map<String, Object>> guestList;

    @Type(JsonType.class)
    @Column(name = "budget_breakdown", columnDefinition = "jsonb")
    private List<Map<String, Object>> budgetBreakdown;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (eventTypeSlug == null) eventTypeSlug = "wedding";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
