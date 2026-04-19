package com.prani.service;

import com.prani.entity.AuditLog;
import com.prani.entity.User;
import com.prani.entity.UserSession;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserSessionRepository userSessionRepository;
    private final EventRepository eventRepository;
    private final InventoryRepository inventoryRepository;
    private final TransactionRepository transactionRepository;
    private final VendorRepository vendorRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;

    public Page<User> listUsers(String role, Pageable pageable) {
        if (role != null) return userRepository.findByRoleAndIsActiveTrue(role, pageable);
        return userRepository.findByIsActiveTrue(pageable);
    }

    @Transactional
    public User createUser(Map<String, String> data) {
        if (userRepository.existsByEmail(data.get("email"))) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = User.builder()
            .userId(UUID.randomUUID().toString())
            .email(data.get("email").toLowerCase().trim())
            .name(data.get("name"))
            .role(data.getOrDefault("role", "staff"))
            .passwordHash(passwordEncoder.encode(data.get("password")))
            .mfaEnabled(false)
            .isActive(true)
            .skills(List.of())
            .certifications(List.of())
            .build();
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(String userId, Map<String, Object> updates) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (updates.containsKey("name")) user.setName((String) updates.get("name"));
        if (updates.containsKey("role")) user.setRole((String) updates.get("role"));
        if (updates.containsKey("is_active")) user.setIsActive((Boolean) updates.get("is_active"));
        return userRepository.save(user);
    }

    @Transactional
    public void deactivateUser(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setIsActive(false);
        userRepository.save(user);
        userSessionRepository.deleteByUserId(userId);
    }

    public Page<AuditLog> getAuditLogs(String userId, String action, String resource,
                                        String startDate, String endDate, Pageable pageable) {
        if (startDate != null && endDate != null) {
            java.time.OffsetDateTime start = java.time.OffsetDateTime.parse(startDate + "T00:00:00Z");
            java.time.OffsetDateTime end = java.time.OffsetDateTime.parse(endDate + "T23:59:59Z");
            return auditLogRepository.findByTimestampBetween(start, end, pageable);
        }
        if (userId != null) return auditLogRepository.findByUserId(userId, pageable);
        if (action != null) return auditLogRepository.findByAction(action, pageable);
        if (resource != null) return auditLogRepository.findByResource(resource, pageable);
        return auditLogRepository.findAll(pageable);
    }

    public List<UserSession> getActiveSessions() {
        return userSessionRepository.findTop50ByOrderByCreatedAtDesc();
    }

    public Map<String, Object> getDashboardStats() {
        long totalUsers = userRepository.count();
        long adminCount = userRepository.countByRoleAndActive("admin");
        long staffCount = userRepository.countByRoleAndActive("staff");
        long clientCount = userRepository.countByRoleAndActive("client");
        long vendorCount = userRepository.countByRoleAndActive("vendor");
        long totalEvents = eventRepository.count();
        long totalInventory = inventoryRepository.count();
        long totalTransactions = transactionRepository.count();
        long totalVendors = vendorRepository.count();

        return Map.of(
            "total_users", totalUsers,
            "users_by_role", Map.of(
                "admin", adminCount, "staff", staffCount,
                "client", clientCount, "vendor", vendorCount
            ),
            "total_events", totalEvents,
            "total_inventory_items", totalInventory,
            "total_transactions", totalTransactions,
            "total_vendors", totalVendors
        );
    }
}
