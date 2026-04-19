package com.prani.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @Column(name = "log_id", length = 36)
    private String logId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "user_email")
    private String userEmail;

    @Column(nullable = false)
    private String action; // create | update | delete | login | logout | mfa_setup...

    @Column(nullable = false)
    private String resource; // user | inventory | transaction | event | vendor...

    @Column(name = "resource_id")
    private String resourceId;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> details;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "timestamp")
    private OffsetDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = OffsetDateTime.now();
    }
}
