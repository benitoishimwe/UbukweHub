package com.prani.repository;

import com.prani.entity.WeddingDesignAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WeddingDesignAssetRepository extends JpaRepository<WeddingDesignAsset, String> {
    List<WeddingDesignAsset> findByPlanIdOrderBySortOrderAsc(String planId);
}
