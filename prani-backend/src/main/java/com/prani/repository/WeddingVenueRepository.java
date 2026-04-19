package com.prani.repository;

import com.prani.entity.WeddingVenue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WeddingVenueRepository extends JpaRepository<WeddingVenue, String> {
    List<WeddingVenue> findByPlanIdOrderByCreatedAtDesc(String planId);
}
