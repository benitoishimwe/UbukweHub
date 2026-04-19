package com.prani.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Service
public class EmailService {

    @Value("${prani.resend.api-key}")
    private String resendApiKey;

    @Value("${prani.resend.from-email}")
    private String fromEmail;

    @Value("${prani.resend.from-name}")
    private String fromName;

    private final WebClient webClient = WebClient.builder()
        .baseUrl("https://api.resend.com")
        .build();

    public void sendOtpEmail(String toEmail, String code) {
        String html = """
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#F5F0E8;border-radius:16px;">
              <h2 style="color:#C9A84C;font-family:Georgia,serif;">Prani Verification Code</h2>
              <p style="font-size:16px;color:#2D2D2D;">Your one-time login code is:</p>
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2D2D2D;margin:24px 0;">%s</div>
              <p style="font-size:13px;color:#5C5C5C;">This code expires in 10 minutes. If you didn't request this, please ignore.</p>
              <hr style="border:none;border-top:1px solid #EBE5DB;margin:24px 0;">
              <p style="font-size:12px;color:#9A7D2E;">Prani — AI-Powered Event Planning</p>
            </div>
            """.formatted(code);

        try {
            webClient.post()
                .uri("/emails")
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json")
                .bodyValue(Map.of(
                    "from", fromName + " <" + fromEmail + ">",
                    "to", new String[]{toEmail},
                    "subject", "Your Prani verification code: " + code,
                    "html", html
                ))
                .retrieve()
                .bodyToMono(String.class)
                .block();
            log.info("OTP email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send OTP email");
        }
    }
}
