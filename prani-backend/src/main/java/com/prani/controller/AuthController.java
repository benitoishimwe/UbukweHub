package com.prani.controller;

import com.prani.entity.User;
import com.prani.repository.UserRepository;
import com.prani.security.PraniAuthPrincipal;
import com.prani.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        var result = authService.register(
            body.get("email"), body.get("password"),
            body.get("name"), body.get("role")
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body,
                                    HttpServletRequest request) {
        var result = authService.login(
            body.get("email"), body.get("password"), request.getRemoteAddr()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify-mfa")
    public ResponseEntity<?> verifyMfa(@RequestBody Map<String, String> body,
                                        HttpServletRequest request) {
        var result = authService.verifyMfa(
            body.get("user_id"), body.get("code"),
            body.getOrDefault("method", "totp"), request.getRemoteAddr()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/send-email-otp")
    public ResponseEntity<?> sendEmailOtp(@RequestBody Map<String, String> body) {
        authService.sendEmailOtp(body.get("user_id"));
        return ResponseEntity.ok(Map.of("message", "OTP sent"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal PraniAuthPrincipal principal) {
        User user = userRepository.findById(principal.getUserId())
            .orElseThrow();
        return ResponseEntity.ok(authService.toUserMap(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @GetMapping("/totp-setup")
    public ResponseEntity<?> totpSetup(@AuthenticationPrincipal PraniAuthPrincipal principal) {
        return ResponseEntity.ok(authService.setupTotp(principal.getUserId()));
    }

    @PostMapping("/verify-totp-setup")
    public ResponseEntity<?> verifyTotpSetup(@AuthenticationPrincipal PraniAuthPrincipal principal,
                                              @RequestBody Map<String, String> body) {
        authService.verifyTotpSetup(principal.getUserId(), body.get("code"));
        return ResponseEntity.ok(Map.of("message", "TOTP MFA enabled"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal PraniAuthPrincipal principal,
                                             @RequestBody Map<String, String> body) {
        authService.changePassword(principal.getUserId(),
            body.get("current_password"), body.get("new_password"));
        return ResponseEntity.ok(Map.of("message", "Password changed"));
    }

    // Google OAuth — accept session_id from Supabase OAuth callback, return JWT
    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@RequestBody Map<String, String> body,
                                         HttpServletRequest request) {
        var result = authService.loginWithSession(body.get("session_id"), request.getRemoteAddr());
        return ResponseEntity.ok(result);
    }
}
