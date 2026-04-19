package com.prani.controller;

import com.prani.entity.*;
import com.prani.security.PraniAuthPrincipal;
import com.prani.service.WeddingPlannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/wedding-plans")
@RequiredArgsConstructor
public class WeddingPlannerController {

    private final WeddingPlannerService service;

    // ─── Plan ─────────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body,
                                     @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.createPlan(p.getUserId(), body));
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrent(@AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.getCurrentPlan(p.getUserId()));
    }

    @GetMapping("/{planId}")
    public ResponseEntity<?> getPlan(@PathVariable String planId,
                                      @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.getPlanById(planId, p.getUserId()));
    }

    @PutMapping("/{planId}")
    public ResponseEntity<?> update(@PathVariable String planId,
                                     @RequestBody Map<String, Object> body,
                                     @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.updatePlan(planId, p.getUserId(), body));
    }

    @DeleteMapping("/{planId}")
    public ResponseEntity<?> delete(@PathVariable String planId,
                                     @AuthenticationPrincipal PraniAuthPrincipal p) {
        service.deletePlan(planId, p.getUserId());
        return ResponseEntity.ok(Map.of("message", "Plan deleted"));
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/{planId}/dashboard")
    public ResponseEntity<?> dashboard(@PathVariable String planId,
                                        @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.getDashboard(planId, p.getUserId()));
    }

    // ─── Budget ───────────────────────────────────────────────────────────────

    @GetMapping("/{planId}/budget")
    public ResponseEntity<?> listBudget(@PathVariable String planId,
                                         @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.listBudget(planId, p.getUserId()));
    }

    @GetMapping("/{planId}/budget/summary")
    public ResponseEntity<?> budgetSummary(@PathVariable String planId,
                                            @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.getBudgetSummary(planId, p.getUserId()));
    }

    @PostMapping("/{planId}/budget")
    public ResponseEntity<?> addBudget(@PathVariable String planId,
                                        @RequestBody BudgetItem item,
                                        @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.addBudgetItem(planId, p.getUserId(), item));
    }

    @PutMapping("/{planId}/budget/{itemId}")
    public ResponseEntity<?> updateBudget(@PathVariable String planId,
                                           @PathVariable String itemId,
                                           @RequestBody BudgetItem updates,
                                           @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.updateBudgetItem(planId, itemId, p.getUserId(), updates));
    }

    @DeleteMapping("/{planId}/budget/{itemId}")
    public ResponseEntity<?> deleteBudget(@PathVariable String planId,
                                           @PathVariable String itemId,
                                           @AuthenticationPrincipal PraniAuthPrincipal p) {
        service.deleteBudgetItem(planId, itemId, p.getUserId());
        return ResponseEntity.ok(Map.of("message", "Budget item deleted"));
    }

    // ─── Guests ───────────────────────────────────────────────────────────────

    @GetMapping("/{planId}/guests")
    public ResponseEntity<?> listGuests(@PathVariable String planId,
                                         @RequestParam(required = false) String rsvp_status,
                                         @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.listGuests(planId, p.getUserId(), rsvp_status));
    }

    @GetMapping("/{planId}/guests/summary")
    public ResponseEntity<?> guestSummary(@PathVariable String planId,
                                           @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.getGuestSummary(planId, p.getUserId()));
    }

    @PostMapping("/{planId}/guests")
    public ResponseEntity<?> addGuest(@PathVariable String planId,
                                       @RequestBody WeddingGuest guest,
                                       @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.addGuest(planId, p.getUserId(), guest));
    }

    @PostMapping(value = "/{planId}/guests/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> importGuests(@PathVariable String planId,
                                           @RequestParam("file") MultipartFile file,
                                           @AuthenticationPrincipal PraniAuthPrincipal p) {
        var imported = service.importGuestsFromCsv(planId, p.getUserId(), file);
        return ResponseEntity.ok(Map.of("imported", imported.size(), "guests", imported));
    }

    @PutMapping("/{planId}/guests/{guestId}")
    public ResponseEntity<?> updateGuest(@PathVariable String planId,
                                          @PathVariable String guestId,
                                          @RequestBody WeddingGuest updates,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.updateGuest(planId, guestId, p.getUserId(), updates));
    }

    @DeleteMapping("/{planId}/guests/{guestId}")
    public ResponseEntity<?> deleteGuest(@PathVariable String planId,
                                          @PathVariable String guestId,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        service.deleteGuest(planId, guestId, p.getUserId());
        return ResponseEntity.ok(Map.of("message", "Guest deleted"));
    }

    // ─── Venues ───────────────────────────────────────────────────────────────

    @GetMapping("/{planId}/venues")
    public ResponseEntity<?> listVenues(@PathVariable String planId,
                                         @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.listVenues(planId, p.getUserId()));
    }

    @PostMapping("/{planId}/venues")
    public ResponseEntity<?> addVenue(@PathVariable String planId,
                                       @RequestBody WeddingVenue venue,
                                       @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.addVenue(planId, p.getUserId(), venue));
    }

    @PutMapping("/{planId}/venues/{venueId}")
    public ResponseEntity<?> updateVenue(@PathVariable String planId,
                                          @PathVariable String venueId,
                                          @RequestBody WeddingVenue updates,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.updateVenue(planId, venueId, p.getUserId(), updates));
    }

    @DeleteMapping("/{planId}/venues/{venueId}")
    public ResponseEntity<?> deleteVenue(@PathVariable String planId,
                                          @PathVariable String venueId,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        service.deleteVenue(planId, venueId, p.getUserId());
        return ResponseEntity.ok(Map.of("message", "Venue deleted"));
    }

    // ─── Menu ─────────────────────────────────────────────────────────────────

    @GetMapping("/{planId}/menu")
    public ResponseEntity<?> listMenu(@PathVariable String planId,
                                       @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.listMenu(planId, p.getUserId()));
    }

    @GetMapping("/{planId}/menu/meal-summary")
    public ResponseEntity<?> mealSummary(@PathVariable String planId,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.getMealSummary(planId, p.getUserId()));
    }

    @PostMapping("/{planId}/menu")
    public ResponseEntity<?> addMenuItem(@PathVariable String planId,
                                          @RequestBody WeddingMenuItem item,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.addMenuItem(planId, p.getUserId(), item));
    }

    @PutMapping("/{planId}/menu/{itemId}")
    public ResponseEntity<?> updateMenuItem(@PathVariable String planId,
                                             @PathVariable String itemId,
                                             @RequestBody WeddingMenuItem updates,
                                             @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.updateMenuItem(planId, itemId, p.getUserId(), updates));
    }

    @DeleteMapping("/{planId}/menu/{itemId}")
    public ResponseEntity<?> deleteMenuItem(@PathVariable String planId,
                                             @PathVariable String itemId,
                                             @AuthenticationPrincipal PraniAuthPrincipal p) {
        service.deleteMenuItem(planId, itemId, p.getUserId());
        return ResponseEntity.ok(Map.of("message", "Menu item deleted"));
    }

    // ─── Design Assets ────────────────────────────────────────────────────────

    @GetMapping("/{planId}/design-assets")
    public ResponseEntity<?> listAssets(@PathVariable String planId,
                                         @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.listAssets(planId, p.getUserId()));
    }

    @PostMapping(value = "/{planId}/design-assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAsset(@PathVariable String planId,
                                          @RequestParam("file") MultipartFile file,
                                          @RequestParam(value = "caption", required = false) String caption,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.uploadAsset(planId, p.getUserId(), file, caption));
    }

    @PutMapping("/{planId}/design-assets/{assetId}")
    public ResponseEntity<?> updateAsset(@PathVariable String planId,
                                          @PathVariable String assetId,
                                          @RequestBody Map<String, Object> body,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        return ResponseEntity.ok(service.updateAsset(planId, assetId, p.getUserId(), body));
    }

    @DeleteMapping("/{planId}/design-assets/{assetId}")
    public ResponseEntity<?> deleteAsset(@PathVariable String planId,
                                          @PathVariable String assetId,
                                          @AuthenticationPrincipal PraniAuthPrincipal p) {
        service.deleteAsset(planId, assetId, p.getUserId());
        return ResponseEntity.ok(Map.of("message", "Asset deleted"));
    }
}
