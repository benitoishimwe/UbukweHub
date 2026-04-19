package com.prani.controller;

import com.prani.entity.SaveTheDateDesign;
import com.prani.exception.FeatureGatedException;
import com.prani.security.PraniAuthPrincipal;
import com.prani.service.SaveTheDateService;
import com.prani.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/save-the-date")
@RequiredArgsConstructor
public class SaveTheDateController {

    private final SaveTheDateService saveTheDateService;
    private final SubscriptionService subscriptionService;

    private void requireFeature(String userId) {
        if (!subscriptionService.isFeatureEnabled(userId, "save_the_date")) {
            throw new FeatureGatedException("save_the_date");
        }
    }

    @GetMapping("/templates")
    public ResponseEntity<?> templates() {
        return ResponseEntity.ok(saveTheDateService.getTemplates());
    }

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(saveTheDateService.listByUser(principal.getUserId(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable String id) {
        return ResponseEntity.ok(saveTheDateService.getById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(
        @RequestBody SaveTheDateDesign design,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        requireFeature(principal.getUserId());
        design.setUserId(principal.getUserId());
        return ResponseEntity.ok(saveTheDateService.create(design));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id,
                                     @RequestBody SaveTheDateDesign updates) {
        return ResponseEntity.ok(saveTheDateService.update(id, updates));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        saveTheDateService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Design deleted"));
    }

    @PostMapping("/{id}/generate")
    public ResponseEntity<?> generate(
        @PathVariable String id,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        requireFeature(principal.getUserId());
        return ResponseEntity.ok(saveTheDateService.generate(id));
    }
}
