package com.prani.repository;

import com.prani.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String> {
    Page<Transaction> findByType(String type, Pageable pageable);
    Page<Transaction> findByItemId(String itemId, Pageable pageable);
    Page<Transaction> findByEventId(String eventId, Pageable pageable);
    Page<Transaction> findByStaffId(String staffId, Pageable pageable);

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.type = :type")
    long countByType(String type);
}
