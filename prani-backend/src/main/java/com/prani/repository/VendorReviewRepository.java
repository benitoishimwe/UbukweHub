package com.prani.repository;

import com.prani.entity.VendorReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface VendorReviewRepository extends JpaRepository<VendorReview, String> {
    Page<VendorReview> findByVendorId(String vendorId, Pageable pageable);
    boolean existsByVendorIdAndUserId(String vendorId, String userId);

    @Query("SELECT AVG(r.rating) FROM VendorReview r WHERE r.vendorId = :vendorId")
    Double avgRatingByVendorId(String vendorId);
}
