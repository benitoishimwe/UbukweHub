package com.prani.service;

import com.prani.entity.EmailOtp;
import com.prani.entity.User;
import com.prani.entity.UserSession;
import com.prani.exception.ResourceNotFoundException;
import com.prani.exception.UnauthorizedException;
import com.prani.repository.EmailOtpRepository;
import com.prani.repository.UserRepository;
import com.prani.repository.UserSessionRepository;
import com.prani.security.JwtService;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final SubscriptionService subscriptionService;

    private final TimeProvider timeProvider = new SystemTimeProvider();
    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);

    @Transactional
    public Map<String, Object> register(String email, String password, String name, String role) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }

        String userId = UUID.randomUUID().toString();
        User user = User.builder()
            .userId(userId)
            .email(email.toLowerCase().trim())
            .name(name)
            .role(role != null ? role : "client")
            .passwordHash(passwordEncoder.encode(password))
            .mfaEnabled(false)
            .isActive(true)
            .skills(List.of())
            .certifications(List.of())
            .build();

        userRepository.save(user);

        // Create free subscription for new user
        subscriptionService.createFreeSubscription(userId);

        String token = jwtService.createToken(userId, user.getRole(), user.getEmail());
        return Map.of("token", token, "user", toUserMap(user));
    }

    public Map<String, Object> login(String email, String password, String ipAddress) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
            .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!user.getIsActive()) {
            throw new UnauthorizedException("Account is deactivated");
        }
        if (user.getPasswordHash() == null ||
            !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (Boolean.TRUE.equals(user.getMfaEnabled())) {
            return Map.of("mfa_required", true, "user_id", user.getUserId());
        }

        String token = jwtService.createToken(user.getUserId(), user.getRole(), user.getEmail());
        auditService.log(null, "login", "user", user.getUserId(),
            Map.of("email", email), ipAddress);
        return Map.of("token", token, "user", toUserMap(user));
    }

    @Transactional
    public Map<String, Object> verifyMfa(String userId, String code, String method, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean valid = false;

        if ("totp".equals(method)) {
            valid = codeVerifier.isValidCode(user.getMfaSecret(), code);
        } else if ("email".equals(method)) {
            EmailOtp otp = emailOtpRepository.findTopByUserIdOrderByCreatedAtDesc(userId)
                .orElseThrow(() -> new UnauthorizedException("No OTP found"));
            if (otp.getExpiresAt().isAfter(OffsetDateTime.now()) && otp.getCode().equals(code)) {
                valid = true;
                emailOtpRepository.delete(otp);
            }
        }

        if (!valid) {
            throw new UnauthorizedException("Invalid or expired code");
        }

        String token = jwtService.createToken(user.getUserId(), user.getRole(), user.getEmail());
        auditService.log(null, "mfa_login", "user", userId, Map.of("method", method), ipAddress);
        return Map.of("token", token, "user", toUserMap(user));
    }

    @Transactional
    public void sendEmailOtp(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String code = String.format("%06d", new Random().nextInt(999999));
        EmailOtp otp = EmailOtp.builder()
            .otpId(UUID.randomUUID().toString())
            .userId(userId)
            .code(code)
            .expiresAt(OffsetDateTime.now().plusMinutes(10))
            .build();
        emailOtpRepository.save(otp);
        emailService.sendOtpEmail(user.getEmail(), code);
    }

    public Map<String, String> setupTotp(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String secret = new DefaultSecretGenerator().generate();
        String otpAuthUri = "otpauth://totp/Prani:" + user.getEmail()
            + "?secret=" + secret + "&issuer=Prani";

        // Store secret temporarily — confirmed on verify-totp-setup
        user.setMfaSecret(secret);
        userRepository.save(user);

        return Map.of("secret", secret, "otp_uri", otpAuthUri);
    }

    @Transactional
    public void verifyTotpSetup(String userId, String code) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!codeVerifier.isValidCode(user.getMfaSecret(), code)) {
            throw new UnauthorizedException("Invalid TOTP code");
        }

        user.setMfaEnabled(true);
        userRepository.save(user);
        auditService.log(null, "mfa_setup", "user", userId, Map.of("method", "totp"), null);
    }

    @Transactional
    public void changePassword(String userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new UnauthorizedException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        auditService.log(null, "password_change", "user", userId, Map.of(), null);
    }

    // Google OAuth — lookup session token, return JWT (mirrors Python POST /auth/google)
    @Transactional
    public Map<String, Object> loginWithSession(String sessionId, String ipAddress) {
        UserSession session = userSessionRepository.findBySessionToken(sessionId)
            .orElseThrow(() -> new UnauthorizedException("Invalid or expired session"));

        User user = userRepository.findById(session.getUserId())
            .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (!user.getIsActive()) {
            throw new UnauthorizedException("Account is deactivated");
        }

        String token = jwtService.createToken(user.getUserId(), user.getRole(), user.getEmail());
        auditService.log(null, "google_login", "user", user.getUserId(), Map.of(), ipAddress);
        return Map.of("token", token, "user", toUserMap(user));
    }

    public Map<String, Object> toUserMap(User user) {
        return Map.of(
            "user_id", user.getUserId(),
            "email", user.getEmail(),
            "name", user.getName(),
            "role", user.getRole(),
            "mfa_enabled", Boolean.TRUE.equals(user.getMfaEnabled()),
            "is_active", Boolean.TRUE.equals(user.getIsActive()),
            "skills", user.getSkills() != null ? user.getSkills() : List.of(),
            "certifications", user.getCertifications() != null ? user.getCertifications() : List.of(),
            "created_at", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null
        );
    }
}
