package com.prani.repository;

import com.prani.entity.WeddingPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WeddingPlanRepository extends JpaRepository<WeddingPlan, String> {
    Optional<WeddingPlan> findTopByUserIdOrderByCreatedAtDesc(String userId);
}
