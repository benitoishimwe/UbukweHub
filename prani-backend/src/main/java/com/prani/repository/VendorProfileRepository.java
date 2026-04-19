package com.prani.repository;

import com.prani.entity.VendorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VendorProfileRepository extends JpaRepository<VendorProfile, String> {
    Optional<VendorProfile> findByVendorId(String vendorId);
}
