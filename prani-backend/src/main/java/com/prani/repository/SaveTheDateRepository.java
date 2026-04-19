package com.prani.repository;

import com.prani.entity.SaveTheDateDesign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SaveTheDateRepository extends JpaRepository<SaveTheDateDesign, String> {
    Page<SaveTheDateDesign> findByUserId(String userId, Pageable pageable);
    long countByUserIdAndStatus(String userId, String status);
}
