package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "albums")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Album {

    @Id
    @Column(name = "album_id", length = 36)
    private String albumId;

    @Column(name = "event_id", nullable = false, length = 36)
    private String eventId;

    @Column(unique = true, nullable = false, length = 64)
    private String token;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active")
    private boolean isActive;

    @Column(name = "max_file_size_mb")
    private int maxFileSizeMb;

    @Column(name = "allow_videos")
    private boolean allowVideos;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (maxFileSizeMb == 0) maxFileSizeMb = 50;
        isActive = true;
        allowVideos = true;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
