package com.prani.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AiAssistantService {

    @Value("${prani.claude.api-key}")
    private String claudeApiKey;

    @Value("${prani.claude.model}")
    private String claudeModel;

    @Value("${prani.claude.api-version}")
    private String claudeApiVersion;

    private final WebClient claudeClient = WebClient.builder()
        .baseUrl("https://api.anthropic.com")
        .build();

    private String callClaude(String systemPrompt, String userMessage) {
        Map<String, Object> body = Map.of(
            "model", claudeModel,
            "max_tokens", 4096,
            "system", systemPrompt,
            "messages", List.of(Map.of("role", "user", "content", userMessage))
        );

        try {
            Map<?, ?> response = claudeClient.post()
                .uri("/v1/messages")
                .header("x-api-key", claudeApiKey)
                .header("anthropic-version", claudeApiVersion)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            if (response != null && response.containsKey("content")) {
                List<?> content = (List<?>) response.get("content");
                if (!content.isEmpty()) {
                    Map<?, ?> firstBlock = (Map<?, ?>) content.get(0);
                    return (String) firstBlock.get("text");
                }
            }
            throw new RuntimeException("Empty response from Claude");
        } catch (Exception e) {
            log.error("Claude API call failed: {}", e.getMessage());
            throw new RuntimeException("AI service temporarily unavailable");
        }
    }

    public Map<String, Object> generateChecklist(String eventType, String eventName,
                                                   int guestCount, String additionalContext) {
        String system = """
            You are Prani AI, an expert event planning assistant for African events.
            Generate practical, culturally-aware checklists for events.
            Respond with valid JSON only — no markdown, no explanation.
            Format: {"checklist": [{"category": "...", "item": "...", "due_weeks_before": N, "priority": "high|medium|low"}]}
            """;
        String prompt = """
            Generate a comprehensive planning checklist for:
            Event type: %s
            Event name: %s
            Guest count: %d
            Additional context: %s

            Include 15-25 items covering venue, catering, decor, entertainment, logistics, and day-of tasks.
            """.formatted(eventType, eventName, guestCount, additionalContext);

        String raw = callClaude(system, prompt);
        return parseJson(raw);
    }

    public Map<String, Object> generateTimeline(String eventType, String eventDate,
                                                  String startTime, String endTime) {
        String system = """
            You are Prani AI, an expert event timeline planner.
            Respond with valid JSON only.
            Format: {"timeline": [{"time": "HH:MM", "activity": "...", "duration_minutes": N, "responsible": "..."}]}
            """;
        String prompt = """
            Create a detailed event-day timeline for:
            Type: %s, Date: %s, Start: %s, End: %s
            Include setup, guest arrival, key moments, meals, and wrap-up.
            """.formatted(eventType, eventDate, startTime, endTime);

        String raw = callClaude(system, prompt);
        return parseJson(raw);
    }

    public Map<String, Object> generateBudget(String eventType, int guestCount,
                                               String currency, double totalBudget) {
        String system = """
            You are Prani AI, an event budget planning expert familiar with East African pricing.
            Respond with valid JSON only.
            Format: {"budget": [{"category": "...", "estimated": N, "percentage": N, "notes": "..."}], "total": N}
            """;
        String prompt = """
            Create a budget breakdown for:
            Event: %s, Guests: %d, Currency: %s, Total budget: %.0f
            Allocate across: venue, catering, decor, entertainment, photography, transport, misc.
            """.formatted(eventType, guestCount, currency, totalBudget);

        String raw = callClaude(system, prompt);
        return parseJson(raw);
    }

    public Map<String, Object> generateSeatingArrangement(int guestCount, int tablesCount,
                                                           int seatsPerTable, String layout) {
        String system = """
            You are Prani AI, a seating arrangement expert.
            Respond with valid JSON only.
            Format: {"tables": [{"table_number": N, "label": "...", "seats": N, "notes": "..."}], "tips": ["..."]}
            """;
        String prompt = """
            Plan seating for %d guests in %d tables of %d seats each.
            Layout preference: %s
            Include VIP table, family tables, general seating, and tips.
            """.formatted(guestCount, tablesCount, seatsPerTable, layout);

        String raw = callClaude(system, prompt);
        return parseJson(raw);
    }

    public Map<String, Object> suggestVendors(String eventType, String location,
                                               String category, double budgetRange) {
        String system = """
            You are Prani AI, an event vendor recommendation expert for East Africa.
            Respond with valid JSON only.
            Format: {"vendors": [{"category": "...", "type": "...", "price_range": "...", "tip": "..."}]}
            """;
        String prompt = """
            Suggest vendor considerations for:
            Event: %s, Location: %s, Category needed: %s, Budget: %.0f RWF
            Provide tips on what to look for in each vendor type.
            """.formatted(eventType, location, category, budgetRange);

        String raw = callClaude(system, prompt);
        return parseJson(raw);
    }

    public String chat(String message, String eventContext) {
        String system = """
            You are Prani AI, a friendly and professional event planning assistant.
            You help event planners in Africa with weddings, corporate events, birthdays,
            conferences, and private parties. You know about local vendors, traditions,
            budgeting in RWF, and best practices. Be concise, warm, and practical.
            """;
        String prompt = eventContext != null && !eventContext.isBlank()
            ? "Event context: " + eventContext + "\n\nUser question: " + message
            : message;

        return callClaude(system, prompt);
    }

    public Map<String, Object> calculateEventScore(String eventName, String eventType,
                                                    int guestCount, double budget,
                                                    int tasksCompleted, int tasksTotal,
                                                    int vendorsBooked, String venue) {
        String system = """
            You are Prani AI, calculating an Event Readiness Score (0-100).
            Respond with valid JSON only.
            Format: {"score": N, "metrics": {"planning": N, "budget": N, "vendors": N, "logistics": N, "timeline": N, "guest_management": N}, "recommendations": ["..."]}
            """;
        String prompt = """
            Score this event's readiness:
            Name: %s, Type: %s, Guests: %d, Budget: %.0f RWF
            Tasks: %d/%d completed, Vendors booked: %d, Venue: %s
            """.formatted(eventName, eventType, guestCount, budget,
                tasksCompleted, tasksTotal, vendorsBooked, venue);

        String raw = callClaude(system, prompt);
        return parseJson(raw);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String raw) {
        try {
            // Strip markdown code fences if present
            String clean = raw.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(clean, Map.class);
        } catch (Exception e) {
            log.warn("Failed to parse AI JSON response, returning raw: {}", e.getMessage());
            return Map.of("text", raw);
        }
    }
}
