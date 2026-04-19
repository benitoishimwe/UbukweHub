package com.prani.repository;

import com.prani.entity.Vendor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, String> {
    Page<Vendor> findByIsActiveTrue(Pageable pageable);
    Page<Vendor> findByCategoryAndIsActiveTrue(String category, Pageable pageable);
    Page<Vendor> findByNameContainingIgnoreCaseAndIsActiveTrue(String name, Pageable pageable);
}
