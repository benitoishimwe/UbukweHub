package com.prani.repository;

import com.prani.entity.VendorInquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VendorInquiryRepository extends JpaRepository<VendorInquiry, String> {
    Page<VendorInquiry> findByVendorId(String vendorId, Pageable pageable);
    Page<VendorInquiry> findByUserId(String userId, Pageable pageable);
}
