package com.prani.repository;

import com.prani.entity.SubscriptionFeature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionFeatureRepository extends JpaRepository<SubscriptionFeature, String> {
    List<SubscriptionFeature> findByPlan(String plan);
    Optional<SubscriptionFeature> findByPlanAndFeatureKey(String plan, String featureKey);
}
