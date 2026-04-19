package com.prani.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "event_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventType {

    @Id
    @Column(name = "event_type_id", length = 36)
    private String eventTypeId;

    @Column(unique = true, nullable = false)
    private String slug; // wedding | corporate | birthday | conference | private_party

    @Column(nullable = false)
    private String name;

    private String description;
    private String icon;

    @Type(JsonType.class)
    @Column(name = "checklist_template", columnDefinition = "jsonb")
    private List<Map<String, Object>> checklistTemplate;

    @Type(JsonType.class)
    @Column(name = "timeline_template", columnDefinition = "jsonb")
    private List<Map<String, Object>> timelineTemplate;

    @Type(JsonType.class)
    @Column(name = "budget_categories", columnDefinition = "jsonb")
    private List<Map<String, Object>> budgetCategories;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
