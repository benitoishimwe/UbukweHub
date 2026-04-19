package com.prani.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import com.prani.entity.Album;
import com.prani.entity.AlbumMedia;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.AlbumMediaRepository;
import com.prani.repository.AlbumRepository;
import com.prani.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlbumService {

    private final AlbumRepository albumRepository;
    private final AlbumMediaRepository mediaRepository;
    private final EventRepository eventRepository;

    @Value("${prani.public-dir:./public}")
    private String publicDir;

    @Value("${prani.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"
    );
    private static final Set<String> ALLOWED_VIDEO_TYPES = Set.of(
        "video/mp4", "video/quicktime", "video/mpeg", "video/webm"
    );

    @Transactional
    public Album createAlbum(String eventId, String title, String description, String createdBy) {
        eventRepository.findById(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        albumRepository.findByEventId(eventId).ifPresent(existing -> {
            throw new IllegalStateException("An album already exists for this event");
        });

        Album album = Album.builder()
            .albumId(UUID.randomUUID().toString())
            .eventId(eventId)
            .token(generateSecureToken())
            .title(title != null ? title : "Wedding Album")
            .description(description)
            .createdBy(createdBy)
            .build();

        return albumRepository.save(album);
    }

    public Album getByEventId(String eventId) {
        return albumRepository.findByEventId(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("No album for event: " + eventId));
    }

    public Album getById(String albumId) {
        return albumRepository.findById(albumId)
            .orElseThrow(() -> new ResourceNotFoundException("Album not found: " + albumId));
    }

    public Album getByToken(String token) {
        return albumRepository.findByToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Album not found"));
    }

    public Map<String, Object> getAlbumWithMedia(String albumId) {
        Album album = getById(albumId);
        List<AlbumMedia> media = mediaRepository.findByAlbumIdOrderByUploadedAtDesc(albumId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("album", album);
        result.put("media", media);
        result.put("media_count", media.size());
        return result;
    }

    public Map<String, Object> getPublicAlbumByToken(String token) {
        Album album = getByToken(token);
        if (!album.isActive()) {
            throw new IllegalStateException("This album is no longer accepting uploads");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("album_id", album.getAlbumId());
        result.put("title", album.getTitle());
        result.put("description", album.getDescription());
        result.put("allow_videos", album.isAllowVideos());
        result.put("max_file_size_mb", album.getMaxFileSizeMb());
        result.put("media_count", mediaRepository.countByAlbumId(album.getAlbumId()));
        return result;
    }

    public byte[] generateQrCode(String albumId) {
        Album album = getById(albumId);
        String uploadUrl = frontendUrl + "/upload/" + album.getToken();
        try {
            var matrix = new QRCodeWriter().encode(uploadUrl, BarcodeFormat.QR_CODE, 400, 400);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }

    @Transactional
    public List<AlbumMedia> uploadFiles(String token, List<MultipartFile> files, String uploaderName) {
        Album album = getByToken(token);
        if (!album.isActive()) {
            throw new IllegalStateException("This album is not accepting uploads");
        }

        List<AlbumMedia> saved = new ArrayList<>();
        for (MultipartFile file : files) {
            saved.add(processUpload(album, file, uploaderName));
        }
        return saved;
    }

    private AlbumMedia processUpload(Album album, MultipartFile file, String uploaderName) {
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new IllegalArgumentException("Unknown file type");
        }

        boolean isImage = ALLOWED_IMAGE_TYPES.contains(contentType);
        boolean isVideo = ALLOWED_VIDEO_TYPES.contains(contentType);

        if (!isImage && !(isVideo && album.isAllowVideos())) {
            throw new IllegalArgumentException("File type not allowed: " + contentType);
        }

        long maxBytes = (long) album.getMaxFileSizeMb() * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("File exceeds maximum size of " + album.getMaxFileSizeMb() + "MB");
        }

        String mediaId = UUID.randomUUID().toString();
        String ext = getExtension(Objects.requireNonNullElse(file.getOriginalFilename(), "file"));
        String storedName = mediaId + "." + ext;
        String relPath = "albums/" + album.getAlbumId() + "/" + storedName;
        Path savePath = Paths.get(publicDir, "albums", album.getAlbumId(), storedName);

        try {
            Files.createDirectories(savePath.getParent());
            file.transferTo(savePath.toFile());
        } catch (IOException e) {
            throw new RuntimeException("Failed to save file", e);
        }

        AlbumMedia media = AlbumMedia.builder()
            .mediaId(mediaId)
            .albumId(album.getAlbumId())
            .fileName(storedName)
            .originalName(file.getOriginalFilename())
            .fileType(contentType)
            .mediaType(isImage ? "image" : "video")
            .fileSize(file.getSize())
            .fileUrl("/public/" + relPath)
            .uploaderName(uploaderName != null && !uploaderName.isBlank() ? uploaderName : "Guest")
            .build();

        return mediaRepository.save(media);
    }

    @Transactional
    public void deleteMedia(String mediaId) {
        AlbumMedia media = mediaRepository.findById(mediaId)
            .orElseThrow(() -> new ResourceNotFoundException("Media not found: " + mediaId));

        Path filePath = Paths.get(publicDir, media.getFileUrl().replaceFirst("^/public/", ""));
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Could not delete file {}: {}", filePath, e.getMessage());
        }
        mediaRepository.delete(media);
    }

    @Transactional
    public AlbumMedia toggleFavorite(String mediaId) {
        AlbumMedia media = mediaRepository.findById(mediaId)
            .orElseThrow(() -> new ResourceNotFoundException("Media not found: " + mediaId));
        media.setFavorite(!media.isFavorite());
        return mediaRepository.save(media);
    }

    public byte[] downloadAlbumZip(String albumId) {
        List<AlbumMedia> mediaList = mediaRepository.findByAlbumIdOrderByUploadedAtDesc(albumId);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            for (AlbumMedia media : mediaList) {
                Path filePath = Paths.get(publicDir, media.getFileUrl().replaceFirst("^/public/", ""));
                if (Files.exists(filePath)) {
                    String entryName = media.getOriginalName() != null ? media.getOriginalName() : media.getFileName();
                    zos.putNextEntry(new ZipEntry(entryName));
                    Files.copy(filePath, zos);
                    zos.closeEntry();
                }
            }
            zos.finish();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to create ZIP archive", e);
        }
    }

    @Transactional
    public void deleteAlbum(String albumId) {
        Album album = getById(albumId);
        // Delete physical files
        Path albumDir = Paths.get(publicDir, "albums", albumId);
        try {
            if (Files.exists(albumDir)) {
                Files.walk(albumDir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> { try { Files.delete(p); } catch (IOException ignored) {} });
            }
        } catch (IOException e) {
            log.warn("Could not delete album directory: {}", e.getMessage());
        }
        albumRepository.delete(album);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return (dot >= 0 && dot < filename.length() - 1) ? filename.substring(dot + 1).toLowerCase() : "bin";
    }
}
