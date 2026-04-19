package com.prani.repository;

import com.prani.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, String> {
    Optional<EmailOtp> findTopByUserIdOrderByCreatedAtDesc(String userId);
    void deleteByUserIdAndExpiresAtBefore(String userId, OffsetDateTime now);
}
