package com.prani.controller;

import com.prani.security.PraniAuthPrincipal;
import com.prani.service.VendorMarketplaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/marketplace")
@RequiredArgsConstructor
public class VendorMarketplaceController {

    private final VendorMarketplaceService marketplaceService;

    @GetMapping("/vendors")
    public ResponseEntity<?> browse(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("rating").descending());
        return ResponseEntity.ok(marketplaceService.browseVendors(category, search, pageable));
    }

    @GetMapping("/categories")
    public ResponseEntity<?> categories() {
        return ResponseEntity.ok(marketplaceService.getCategories());
    }

    @GetMapping("/vendors/{id}")
    public ResponseEntity<?> detail(@PathVariable String id) {
        return ResponseEntity.ok(marketplaceService.getVendorDetail(id));
    }

    @GetMapping("/vendors/{id}/reviews")
    public ResponseEntity<?> reviews(
        @PathVariable String id,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(marketplaceService.getReviews(id, pageable));
    }

    @PostMapping("/vendors/{id}/inquire")
    public ResponseEntity<?> inquire(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        String message = (String) body.get("message");
        BigDecimal budget = body.get("budget") != null
            ? new BigDecimal(body.get("budget").toString()) : null;
        LocalDate eventDate = body.get("event_date") != null
            ? LocalDate.parse((String) body.get("event_date")) : null;
        String eventId = (String) body.get("event_id");

        var inquiry = marketplaceService.sendInquiry(
            id, principal.getUserId(), message, budget, eventDate, eventId);
        return ResponseEntity.ok(inquiry);
    }

    @PostMapping("/vendors/{id}/review")
    public ResponseEntity<?> review(
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        var review = marketplaceService.addReview(
            id, principal.getUserId(),
            (String) body.get("event_id"),
            ((Number) body.get("rating")).intValue(),
            (String) body.get("title"),
            (String) body.get("body")
        );
        return ResponseEntity.ok(review);
    }

    @GetMapping("/favorites")
    public ResponseEntity<?> favorites(@AuthenticationPrincipal PraniAuthPrincipal principal) {
        return ResponseEntity.ok(Map.of(
            "vendor_ids", marketplaceService.getFavoriteVendorIds(principal.getUserId())
        ));
    }

    @PostMapping("/favorites/{vendorId}")
    public ResponseEntity<?> addFavorite(@PathVariable String vendorId,
                                          @AuthenticationPrincipal PraniAuthPrincipal principal) {
        marketplaceService.addFavorite(principal.getUserId(), vendorId);
        return ResponseEntity.ok(Map.of("message", "Added to favorites"));
    }

    @DeleteMapping("/favorites/{vendorId}")
    public ResponseEntity<?> removeFavorite(@PathVariable String vendorId,
                                             @AuthenticationPrincipal PraniAuthPrincipal principal) {
        marketplaceService.removeFavorite(principal.getUserId(), vendorId);
        return ResponseEntity.ok(Map.of("message", "Removed from favorites"));
    }
}
