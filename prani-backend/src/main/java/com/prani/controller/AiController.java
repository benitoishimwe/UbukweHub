package com.prani.controller;

import com.prani.security.PraniAuthPrincipal;
import com.prani.service.AiAssistantService;
import com.prani.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiAssistantService aiService;
    private final SubscriptionService subscriptionService;

    private void requireAiFeature(String userId) {
        if (!subscriptionService.isFeatureEnabled(userId, "ai_assistant")) {
            throw new com.prani.exception.FeatureGatedException("ai_assistant");
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> body,
                                   @AuthenticationPrincipal PraniAuthPrincipal principal) {
        requireAiFeature(principal.getUserId());
        String response = aiService.chat(body.get("message"), body.get("event_context"));
        return ResponseEntity.ok(Map.of("response", response));
    }

    @PostMapping("/checklist")
    public ResponseEntity<?> checklist(@RequestBody Map<String, Object> body,
                                        @AuthenticationPrincipal PraniAuthPrincipal principal) {
        requireAiFeature(principal.getUserId());
        var result = aiService.generateChecklist(
            (String) body.getOrDefault("event_type", "wedding"),
            (String) body.getOrDefault("event_name", ""),
            ((Number) body.getOrDefault("guest_count", 100)).intValue(),
            (String) body.getOrDefault("context", "")
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/budget")
    public ResponseEntity<?> budget(@RequestBody Map<String, Object> body,
                                     @AuthenticationPrincipal PraniAuthPrincipal principal) {
        requireAiFeature(principal.getUserId());
        var result = aiService.generateBudget(
            (String) body.getOrDefault("event_type", "wedding"),
            ((Number) body.getOrDefault("guest_count", 100)).intValue(),
            (String) body.getOrDefault("currency", "RWF"),
            ((Number) body.getOrDefault("total_budget", 5000000)).doubleValue()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/timeline")
    public ResponseEntity<?> timeline(@RequestBody Map<String, Object> body,
                                       @AuthenticationPrincipal PraniAuthPrincipal principal) {
        requireAiFeature(principal.getUserId());
        var result = aiService.generateTimeline(
            (String) body.getOrDefault("event_type", "wedding"),
            (String) body.getOrDefault("event_date", ""),
            (String) body.getOrDefault("start_time", "09:00"),
            (String) body.getOrDefault("end_time", "22:00")
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/seating")
    public ResponseEntity<?> seating(@RequestBody Map<String, Object> body,
                                      @AuthenticationPrincipal PraniAuthPrincipal principal) {
        requireAiFeature(principal.getUserId());
        var result = aiService.generateSeatingArrangement(
            ((Number) body.getOrDefault("guest_count", 100)).intValue(),
            ((Number) body.getOrDefault("tables_count", 10)).intValue(),
            ((Number) body.getOrDefault("seats_per_table", 10)).intValue(),
            (String) body.getOrDefault("layout", "banquet")
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/vendors")
    public ResponseEntity<?> vendorSuggestions(@RequestBody Map<String, Object> body,
                                                @AuthenticationPrincipal PraniAuthPrincipal principal) {
        requireAiFeature(principal.getUserId());
        var result = aiService.suggestVendors(
            (String) body.getOrDefault("event_type", "wedding"),
            (String) body.getOrDefault("location", "Kigali"),
            (String) body.getOrDefault("category", "all"),
            ((Number) body.getOrDefault("budget", 5000000)).doubleValue()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/greatness")
    public ResponseEntity<?> greatness(@RequestBody Map<String, Object> body,
                                        @AuthenticationPrincipal PraniAuthPrincipal principal) {
        var result = aiService.calculateEventScore(
            (String) body.getOrDefault("event_name", ""),
            (String) body.getOrDefault("event_type", "wedding"),
            ((Number) body.getOrDefault("guest_count", 100)).intValue(),
            ((Number) body.getOrDefault("budget", 0)).doubleValue(),
            ((Number) body.getOrDefault("tasks_completed", 0)).intValue(),
            ((Number) body.getOrDefault("tasks_total", 0)).intValue(),
            ((Number) body.getOrDefault("vendors_booked", 0)).intValue(),
            (String) body.getOrDefault("venue", "")
        );
        return ResponseEntity.ok(result);
    }
}
