package com.prani.repository;

import com.prani.entity.InventoryItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<InventoryItem, String> {
    Optional<InventoryItem> findByQrCode(String qrCode);
    Optional<InventoryItem> findByBarcode(String barcode);
    Page<InventoryItem> findByIsActiveTrue(Pageable pageable);
    Page<InventoryItem> findByCategoryAndIsActiveTrue(String category, Pageable pageable);
    Page<InventoryItem> findByConditionAndIsActiveTrue(String condition, Pageable pageable);
    Page<InventoryItem> findByCategoryAndConditionAndIsActiveTrue(String category, String condition, Pageable pageable);

    @Query("SELECT COUNT(i) FROM InventoryItem i WHERE i.isActive = true")
    long countActive();

    @Query("SELECT SUM(i.available) FROM InventoryItem i WHERE i.isActive = true")
    Long sumAvailable();

    @Query("SELECT SUM(i.rented) FROM InventoryItem i WHERE i.isActive = true")
    Long sumRented();

    @Query("SELECT COUNT(i) FROM InventoryItem i WHERE i.condition = 'maintenance' AND i.isActive = true")
    long countInMaintenance();

    @Query("SELECT DISTINCT i.category FROM InventoryItem i WHERE i.isActive = true AND i.category IS NOT NULL ORDER BY i.category")
    List<String> findDistinctCategories();

    @Query("SELECT i FROM InventoryItem i WHERE i.isActive = true AND (LOWER(i.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(i.qrCode) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<InventoryItem> search(String q, Pageable pageable);
}
