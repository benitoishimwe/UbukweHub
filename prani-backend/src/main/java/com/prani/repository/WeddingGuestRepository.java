package com.prani.repository;

import com.prani.entity.WeddingGuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface WeddingGuestRepository extends JpaRepository<WeddingGuest, String> {
    List<WeddingGuest> findByPlanIdOrderByFullNameAsc(String planId);
    List<WeddingGuest> findByPlanIdAndRsvpStatus(String planId, String rsvpStatus);
    long countByPlanId(String planId);
    long countByPlanIdAndRsvpStatus(String planId, String rsvpStatus);

    @Query("SELECT g.mealChoice, COUNT(g) FROM WeddingGuest g WHERE g.planId = :planId AND g.rsvpStatus = 'attending' AND g.mealChoice IS NOT NULL GROUP BY g.mealChoice")
    List<Object[]> countMealChoicesForPlan(String planId);
}
