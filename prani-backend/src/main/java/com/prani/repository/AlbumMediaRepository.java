package com.prani.repository;

import com.prani.entity.AlbumMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlbumMediaRepository extends JpaRepository<AlbumMedia, String> {
    List<AlbumMedia> findByAlbumIdOrderByUploadedAtDesc(String albumId);
    List<AlbumMedia> findByAlbumIdAndIsFavoriteTrue(String albumId);
    long countByAlbumId(String albumId);
}
