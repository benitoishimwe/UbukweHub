package com.prani.repository;

import com.prani.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, String> {
    Page<Event> findByStatus(String status, Pageable pageable);
    Page<Event> findByEventTypeSlug(String slug, Pageable pageable);
    Page<Event> findByStatusAndEventTypeSlug(String status, String slug, Pageable pageable);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.status = :status")
    long countByStatus(String status);

    @Query("SELECT e FROM Event e WHERE LOWER(e.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(e.venue) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Event> search(String q, Pageable pageable);
}
