package com.prani.repository;

import com.prani.entity.Album;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AlbumRepository extends JpaRepository<Album, String> {
    Optional<Album> findByToken(String token);
    Optional<Album> findByEventId(String eventId);
}
