package com.prani.repository;

import com.prani.entity.Subscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, String> {
    Optional<Subscription> findTopByUserIdAndStatusOrderByCreatedAtDesc(String userId, String status);
    Optional<Subscription> findTopByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Subscription> findByStripeSubscriptionId(String stripeSubscriptionId);
    Page<Subscription> findAll(Pageable pageable);
}
