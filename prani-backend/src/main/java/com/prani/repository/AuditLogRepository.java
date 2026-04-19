package com.prani.repository;

import com.prani.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    Page<AuditLog> findByUserId(String userId, Pageable pageable);
    Page<AuditLog> findByAction(String action, Pageable pageable);
    Page<AuditLog> findByResource(String resource, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.timestamp >= :start AND a.timestamp <= :end")
    Page<AuditLog> findByTimestampBetween(OffsetDateTime start, OffsetDateTime end, Pageable pageable);
}
