package com.prani.controller;

import com.prani.security.PraniAuthPrincipal;
import com.prani.service.AlbumService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AlbumController {

    private final AlbumService albumService;

    // Create album for an event
    @PostMapping("/api/events/{eventId}/albums")
    public ResponseEntity<?> create(
        @PathVariable String eventId,
        @RequestBody(required = false) Map<String, String> body,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        String title = body != null ? body.get("title") : null;
        String description = body != null ? body.get("description") : null;
        return ResponseEntity.ok(albumService.createAlbum(eventId, title, description, principal.getUserId()));
    }

    // Get album for an event (includes media)
    @GetMapping("/api/events/{eventId}/albums")
    public ResponseEntity<?> getByEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(albumService.getAlbumWithMedia(albumService.getByEventId(eventId).getAlbumId()));
    }

    // Get album by ID with media list
    @GetMapping("/api/albums/{albumId}")
    public ResponseEntity<?> getAlbum(@PathVariable String albumId) {
        return ResponseEntity.ok(albumService.getAlbumWithMedia(albumId));
    }

    // Serve QR code as PNG image
    @GetMapping("/api/albums/{albumId}/qrcode")
    public ResponseEntity<byte[]> qrCode(@PathVariable String albumId) {
        byte[] png = albumService.generateQrCode(albumId);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"album-qr.png\"")
            .body(png);
    }

    // Download all media as ZIP
    @GetMapping("/api/albums/{albumId}/download")
    public ResponseEntity<byte[]> downloadZip(@PathVariable String albumId) {
        byte[] zip = albumService.downloadAlbumZip(albumId);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/zip"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"album-" + albumId + ".zip\"")
            .body(zip);
    }

    // Delete a single media item
    @DeleteMapping("/api/albums/{albumId}/media/{mediaId}")
    public ResponseEntity<?> deleteMedia(@PathVariable String albumId, @PathVariable String mediaId) {
        albumService.deleteMedia(mediaId);
        return ResponseEntity.ok(Map.of("message", "Media deleted"));
    }

    // Toggle favorite
    @PutMapping("/api/albums/{albumId}/media/{mediaId}/favorite")
    public ResponseEntity<?> toggleFavorite(@PathVariable String albumId, @PathVariable String mediaId) {
        return ResponseEntity.ok(albumService.toggleFavorite(mediaId));
    }

    // Delete entire album
    @DeleteMapping("/api/albums/{albumId}")
    public ResponseEntity<?> deleteAlbum(@PathVariable String albumId) {
        albumService.deleteAlbum(albumId);
        return ResponseEntity.ok(Map.of("message", "Album deleted"));
    }
}
