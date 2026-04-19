package com.prani.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "album_media")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlbumMedia {

    @Id
    @Column(name = "media_id", length = 36)
    private String mediaId;

    @Column(name = "album_id", nullable = false, length = 36)
    private String albumId;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "original_name", length = 500)
    private String originalName;

    @Column(name = "file_type", nullable = false, length = 100)
    private String fileType;

    @Column(name = "media_type", nullable = false, length = 10)
    private String mediaType; // image | video

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "file_url", nullable = false, length = 1000)
    private String fileUrl;

    @Column(name = "thumbnail_url", length = 1000)
    private String thumbnailUrl;

    @Column(name = "uploader_name", length = 255)
    private String uploaderName;

    @Column(name = "is_favorite")
    private boolean isFavorite;

    @Column(name = "uploaded_at")
    private OffsetDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = OffsetDateTime.now();
    }
}
