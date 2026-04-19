package com.prani.repository;

import com.prani.entity.VendorFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VendorFavoriteRepository extends JpaRepository<VendorFavorite, String> {
    List<VendorFavorite> findByUserId(String userId);
    Optional<VendorFavorite> findByUserIdAndVendorId(String userId, String vendorId);
    boolean existsByUserIdAndVendorId(String userId, String vendorId);
    void deleteByUserIdAndVendorId(String userId, String vendorId);
}
