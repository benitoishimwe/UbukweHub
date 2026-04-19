package com.prani.repository;

import com.prani.entity.EventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EventTypeRepository extends JpaRepository<EventType, String> {
    Optional<EventType> findBySlug(String slug);
}
