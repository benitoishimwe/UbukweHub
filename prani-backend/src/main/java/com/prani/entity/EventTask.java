package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "event_tasks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventTask {

    @Id
    @Column(name = "task_id", length = 36)
    private String taskId;

    @Column(name = "event_id", length = 36, nullable = false)
    private String eventId;

    @Column(nullable = false)
    private String title;

    private String description;
    private String category;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(nullable = false)
    private String status; // todo | in_progress | done

    @Column(nullable = false)
    private String priority; // high | medium | low

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (status == null) status = "todo";
        if (priority == null) priority = "medium";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
