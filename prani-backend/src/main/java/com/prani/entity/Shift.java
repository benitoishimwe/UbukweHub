package com.prani.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "shifts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Shift {

    @Id
    @Column(name = "shift_id", length = 36)
    private String shiftId;

    @Column(name = "event_id", length = 36)
    private String eventId;

    @Column(name = "staff_id", length = 36)
    private String staffId;

    @Column(name = "staff_name")
    private String staffName;

    private String role;
    private String date; // dd/mm/yyyy

    @Column(name = "start_time")
    private String startTime; // HH:MM

    @Column(name = "end_time")
    private String endTime;

    private String status; // scheduled | active | completed | cancelled

    @Type(JsonType.class)
    @Column(name = "tasks", columnDefinition = "jsonb")
    private List<Map<String, Object>> tasks;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
