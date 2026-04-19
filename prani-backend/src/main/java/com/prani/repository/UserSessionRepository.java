package com.prani.repository;

import com.prani.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, String> {
    Optional<UserSession> findBySessionToken(String sessionToken);
    List<UserSession> findTop50ByOrderByCreatedAtDesc();
    void deleteByUserId(String userId);
}
