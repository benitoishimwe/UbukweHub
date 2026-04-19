package com.prani.service;

import com.prani.entity.AuditLog;
import com.prani.repository.AuditLogRepository;
import com.prani.security.PraniAuthPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void log(PraniAuthPrincipal principal, String action, String resource,
                    String resourceId, Map<String, Object> details, String ipAddress) {
        try {
            AuditLog entry = AuditLog.builder()
                .logId(UUID.randomUUID().toString())
                .userId(principal != null ? principal.getUserId() : "system")
                .userEmail(principal != null ? principal.getEmail() : "system")
                .action(action)
                .resource(resource)
                .resourceId(resourceId)
                .details(details)
                .ipAddress(ipAddress)
                .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log: {}", e.getMessage());
        }
    }
}
