package com.prani.service;

import com.prani.entity.SaveTheDateDesign;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.SaveTheDateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SaveTheDateService {

    private final SaveTheDateRepository saveTheDateRepository;

    @Value("${prani.claude.api-key}")
    private String claudeApiKey;

    @Value("${prani.claude.model}")
    private String claudeModel;

    @Value("${prani.claude.api-version}")
    private String claudeApiVersion;

    @Value("${prani.openai.api-key:}")
    private String openaiApiKey;

    private final WebClient claudeClient = WebClient.builder()
        .baseUrl("https://api.anthropic.com").build();

    private final WebClient openaiClient = WebClient.builder()
        .baseUrl("https://api.openai.com").build();

    public Page<SaveTheDateDesign> listByUser(String userId, Pageable pageable) {
        return saveTheDateRepository.findByUserId(userId, pageable);
    }

    public SaveTheDateDesign getById(String id) {
        return saveTheDateRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Design not found: " + id));
    }

    @Transactional
    public SaveTheDateDesign create(SaveTheDateDesign design) {
        design.setDesignId(UUID.randomUUID().toString());
        return saveTheDateRepository.save(design);
    }

    @Transactional
    public SaveTheDateDesign update(String id, SaveTheDateDesign updates) {
        SaveTheDateDesign design = getById(id);
        if (updates.getTitle() != null) design.setTitle(updates.getTitle());
        if (updates.getTemplateId() != null) design.setTemplateId(updates.getTemplateId());
        if (updates.getTextContent() != null) design.setTextContent(updates.getTextContent());
        if (updates.getStyle() != null) design.setStyle(updates.getStyle());
        if (updates.getUploadedPhoto() != null) design.setUploadedPhoto(updates.getUploadedPhoto());
        return saveTheDateRepository.save(design);
    }

    @Transactional
    public void delete(String id) {
        saveTheDateRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Design not found"));
        saveTheDateRepository.deleteById(id);
    }

    @Transactional
    public SaveTheDateDesign generate(String designId) {
        SaveTheDateDesign design = getById(designId);

        // Step 1: Claude generates invitation text
        Map<String, Object> generatedText = generateInvitationText(design);
        Map<String, Object> currentContent = design.getTextContent() != null
            ? new HashMap<>(design.getTextContent()) : new HashMap<>();
        currentContent.putAll(generatedText);
        design.setTextContent(currentContent);

        // Step 2: DALL-E generates background image (if OpenAI key is set)
        if (openaiApiKey != null && !openaiApiKey.isBlank()) {
            try {
                String imageUrl = generateBackgroundImage(design);
                design.setGeneratedImageUrl(imageUrl);
            } catch (Exception e) {
                log.warn("Image generation failed, proceeding without image: {}", e.getMessage());
            }
        }

        return saveTheDateRepository.save(design);
    }

    private Map<String, Object> generateInvitationText(SaveTheDateDesign design) {
        Map<String, Object> textContent = design.getTextContent() != null
            ? design.getTextContent() : Map.of();

        String prompt = """
            Create elegant invitation wording for a save-the-date card:
            Event: %s
            Style: %s
            Existing details: %s

            Return JSON with: {"headline": "...", "subtext": "...", "rsvp_text": "...", "hashtag": "..."}
            Make it warm, celebratory, and culturally appropriate for Africa.
            """.formatted(
            design.getTitle(),
            design.getStyle() != null ? design.getStyle().toString() : "elegant",
            textContent.toString()
        );

        Map<String, Object> body = Map.of(
            "model", claudeModel,
            "max_tokens", 512,
            "system", "You are an elegant event invitation copywriter. Return valid JSON only.",
            "messages", List.of(Map.of("role", "user", "content", prompt))
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
                    String text = (String) ((Map<?, ?>) content.get(0)).get("text");
                    String clean = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                    com.fasterxml.jackson.databind.ObjectMapper mapper =
                        new com.fasterxml.jackson.databind.ObjectMapper();
                    return mapper.readValue(clean, new com.fasterxml.jackson.core.type.TypeReference<>() {});
                }
            }
        } catch (Exception e) {
            log.warn("Claude text generation failed: {}", e.getMessage());
        }
        return Map.of();
    }

    private String generateBackgroundImage(SaveTheDateDesign design) {
        String styleDesc = design.getStyle() != null
            ? design.getStyle().getOrDefault("layout", "elegant").toString()
            : "elegant";

        String dallePrompt = """
            A beautiful, elegant %s style save-the-date invitation background.
            Soft, romantic atmosphere. Floral elements, golden accents.
            High quality, professional event photography aesthetic.
            No text in the image. Suitable for overlaying white text.
            """.formatted(styleDesc);

        Map<String, Object> body = Map.of(
            "model", "dall-e-3",
            "prompt", dallePrompt,
            "n", 1,
            "size", "1024x1024",
            "quality", "standard"
        );

        Map<?, ?> response = openaiClient.post()
            .uri("/v1/images/generations")
            .header("Authorization", "Bearer " + openaiApiKey)
            .header("Content-Type", "application/json")
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        if (response != null && response.containsKey("data")) {
            List<?> data = (List<?>) response.get("data");
            if (!data.isEmpty()) {
                return (String) ((Map<?, ?>) data.get(0)).get("url");
            }
        }
        throw new RuntimeException("DALL-E returned no image");
    }

    public List<Map<String, Object>> getTemplates() {
        return List.of(
            Map.of("id", "elegant-floral", "name", "Elegant Floral", "description",
                "Classic with gold florals", "preview_color", "#C9A84C"),
            Map.of("id", "modern-minimal", "name", "Modern Minimal", "description",
                "Clean lines, bold typography", "preview_color", "#2D2D2D"),
            Map.of("id", "rustic-garden", "name", "Rustic Garden", "description",
                "Earthy tones, greenery accents", "preview_color", "#4A7C59"),
            Map.of("id", "rwandan-tradition", "name", "Rwandan Traditional", "description",
                "Vibrant Imigongo-inspired patterns", "preview_color", "#D4A373"),
            Map.of("id", "corporate-clean", "name", "Corporate Clean", "description",
                "Professional, branded style", "preview_color", "#6B8E9B")
        );
    }
}
