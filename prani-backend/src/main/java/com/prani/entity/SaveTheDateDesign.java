package com.prani.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "save_the_date_designs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SaveTheDateDesign {

    @Id
    @Column(name = "design_id", length = 36)
    private String designId;

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "event_id")
    private String eventId;

    @Column(nullable = false)
    private String title;

    @Column(name = "template_id")
    private String templateId;

    @Type(JsonType.class)
    @Column(name = "text_content", columnDefinition = "jsonb")
    private Map<String, Object> textContent; // headline, subtext, date, venue, rsvp_info

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> style; // primary_color, font, layout

    @Column(name = "uploaded_photo")
    private String uploadedPhoto;

    @Column(name = "generated_image_url")
    private String generatedImageUrl;

    @Column(name = "ai_prompt_used", columnDefinition = "TEXT")
    private String aiPromptUsed;

    @Column(nullable = false)
    private String status; // draft | published

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (status == null) status = "draft";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
