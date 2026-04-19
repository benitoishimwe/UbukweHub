package com.prani.controller;

import com.prani.service.AlbumService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class PublicUploadController {

    private final AlbumService albumService;

    // Public: get album info by token (for the guest upload page)
    @GetMapping("/{token}")
    public ResponseEntity<?> albumInfo(@PathVariable String token) {
        return ResponseEntity.ok(albumService.getPublicAlbumByToken(token));
    }

    // Public: upload files by token
    @PostMapping("/{token}")
    public ResponseEntity<?> upload(
        @PathVariable String token,
        @RequestParam("files") List<MultipartFile> files,
        @RequestParam(value = "uploader_name", required = false) String uploaderName
    ) {
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No files provided"));
        }
        var saved = albumService.uploadFiles(token, files, uploaderName);
        return ResponseEntity.ok(Map.of(
            "uploaded", saved.size(),
            "media", saved
        ));
    }
}
