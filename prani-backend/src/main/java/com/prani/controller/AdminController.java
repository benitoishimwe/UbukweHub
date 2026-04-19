package com.prani.controller;

import com.prani.security.PraniAuthPrincipal;
import com.prani.service.AdminService;
import com.prani.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final SubscriptionService subscriptionService;

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    @GetMapping("/users")
    public ResponseEntity<?> users(
        @RequestParam(required = false) String role,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = adminService.listUsers(role, pageable);
        return ResponseEntity.ok(Map.of(
            "users", result.getContent(),
            "total", result.getTotalElements(),
            "page", result.getNumber() + 1
        ));
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.createUser(body));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable String userId,
                                         @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(adminService.updateUser(userId, body));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        adminService.deactivateUser(userId);
        return ResponseEntity.ok(Map.of("message", "User deactivated"));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<?> auditLogs(
        @RequestParam(required = false) String user_id,
        @RequestParam(required = false) String action,
        @RequestParam(required = false) String resource,
        @RequestParam(required = false) String start_date,
        @RequestParam(required = false) String end_date,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        var result = adminService.getAuditLogs(user_id, action, resource, start_date, end_date, pageable);
        return ResponseEntity.ok(Map.of(
            "logs", result.getContent(),
            "total", result.getTotalElements(),
            "page", result.getNumber() + 1
        ));
    }

    @GetMapping("/sessions")
    public ResponseEntity<?> sessions() {
        return ResponseEntity.ok(adminService.getActiveSessions());
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<?> subscriptions(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(subscriptionService.getAllSubscriptions(pageable));
    }
}
