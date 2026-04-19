package com.prani.repository;

import com.prani.entity.VendorPortfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VendorPortfolioRepository extends JpaRepository<VendorPortfolio, String> {
    List<VendorPortfolio> findByVendorIdOrderByDisplayOrderAsc(String vendorId);
    void deleteAllByVendorId(String vendorId);
}
