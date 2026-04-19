package com.prani.service;

import com.opencsv.CSVReader;
import com.prani.entity.*;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeddingPlannerService {

    private final WeddingPlanRepository planRepo;
    private final BudgetItemRepository budgetRepo;
    private final WeddingGuestRepository guestRepo;
    private final WeddingVenueRepository venueRepo;
    private final WeddingMenuItemRepository menuRepo;
    private final WeddingDesignAssetRepository assetRepo;

    @Value("${prani.public-dir:./public}")
    private String publicDir;

    // ─── Wedding Plan ────────────────────────────────────────────────────────

    @Transactional
    public WeddingPlan createPlan(String userId, Map<String, Object> body) {
        WeddingPlan plan = WeddingPlan.builder()
            .planId(UUID.randomUUID().toString())
            .userId(userId)
            .eventId((String) body.get("event_id"))
            .theme((String) body.getOrDefault("theme", "Modern"))
            .notes((String) body.get("notes"))
            .build();

        if (body.get("wedding_date") != null)
            plan.setWeddingDate(LocalDate.parse((String) body.get("wedding_date")));
        if (body.get("total_budget") != null)
            plan.setTotalBudget(new BigDecimal(body.get("total_budget").toString()));
        if (body.get("primary_color") != null) plan.setPrimaryColor((String) body.get("primary_color"));
        if (body.get("secondary_color") != null) plan.setSecondaryColor((String) body.get("secondary_color"));

        return planRepo.save(plan);
    }

    public WeddingPlan getCurrentPlan(String userId) {
        return planRepo.findTopByUserIdOrderByCreatedAtDesc(userId)
            .orElseThrow(() -> new ResourceNotFoundException("No wedding plan found"));
    }

    public WeddingPlan getPlanById(String planId, String userId) {
        WeddingPlan plan = planRepo.findById(planId)
            .orElseThrow(() -> new ResourceNotFoundException("Plan not found: " + planId));
        assertOwner(plan, userId);
        return plan;
    }

    @Transactional
    public WeddingPlan updatePlan(String planId, String userId, Map<String, Object> body) {
        WeddingPlan plan = getPlanById(planId, userId);
        if (body.containsKey("wedding_date") && body.get("wedding_date") != null)
            plan.setWeddingDate(LocalDate.parse((String) body.get("wedding_date")));
        if (body.containsKey("theme")) plan.setTheme((String) body.get("theme"));
        if (body.containsKey("primary_color")) plan.setPrimaryColor((String) body.get("primary_color"));
        if (body.containsKey("secondary_color")) plan.setSecondaryColor((String) body.get("secondary_color"));
        if (body.containsKey("total_budget") && body.get("total_budget") != null)
            plan.setTotalBudget(new BigDecimal(body.get("total_budget").toString()));
        if (body.containsKey("notes")) plan.setNotes((String) body.get("notes"));
        if (body.containsKey("event_id")) plan.setEventId((String) body.get("event_id"));
        return planRepo.save(plan);
    }

    @Transactional
    public void deletePlan(String planId, String userId) {
        WeddingPlan plan = getPlanById(planId, userId);
        // Delete mood board files
        assetRepo.findByPlanIdOrderBySortOrderAsc(planId).forEach(a -> deleteFile(a.getImageUrl()));
        planRepo.delete(plan);
    }

    // ─── Budget ──────────────────────────────────────────────────────────────

    public List<BudgetItem> listBudget(String planId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        return budgetRepo.findByPlanIdOrderByCreatedAtDesc(planId);
    }

    @Transactional
    public BudgetItem addBudgetItem(String planId, String userId, BudgetItem item) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        item.setItemId(UUID.randomUUID().toString());
        item.setPlanId(planId);
        return budgetRepo.save(item);
    }

    @Transactional
    public BudgetItem updateBudgetItem(String planId, String itemId, String userId, BudgetItem updates) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        BudgetItem item = budgetRepo.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("Budget item not found: " + itemId));
        if (updates.getCategory() != null) item.setCategory(updates.getCategory());
        if (updates.getDescription() != null) item.setDescription(updates.getDescription());
        if (updates.getEstimatedCost() != null) item.setEstimatedCost(updates.getEstimatedCost());
        if (updates.getActualCost() != null) item.setActualCost(updates.getActualCost());
        if (updates.getStatus() != null) item.setStatus(updates.getStatus());
        if (updates.getDueDate() != null) item.setDueDate(updates.getDueDate());
        if (updates.getVendorId() != null) item.setVendorId(updates.getVendorId());
        return budgetRepo.save(item);
    }

    @Transactional
    public void deleteBudgetItem(String planId, String itemId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        budgetRepo.deleteById(itemId);
    }

    public Map<String, Object> getBudgetSummary(String planId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        WeddingPlan plan = planRepo.findById(planId).orElseThrow();
        List<BudgetItem> items = budgetRepo.findByPlanIdOrderByCreatedAtDesc(planId);

        BigDecimal totalEstimated = items.stream().map(BudgetItem::getEstimatedCost)
            .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalActual = items.stream().map(BudgetItem::getActualCost)
            .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remaining = plan.getTotalBudget() != null
            ? plan.getTotalBudget().subtract(totalActual)
            : totalEstimated.subtract(totalActual);

        // Category breakdown
        List<Object[]> rows = budgetRepo.sumByCategoryForPlan(planId);
        List<Map<String, Object>> breakdown = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> cat = new LinkedHashMap<>();
            cat.put("category", row[0]);
            cat.put("estimated", row[1]);
            cat.put("actual", row[2]);
            breakdown.add(cat);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total_budget", plan.getTotalBudget());
        result.put("total_estimated", totalEstimated);
        result.put("total_actual", totalActual);
        result.put("remaining", remaining);
        result.put("paid_count", items.stream().filter(i -> "paid".equals(i.getStatus())).count());
        result.put("total_count", items.size());
        result.put("by_category", breakdown);
        return result;
    }

    // ─── Guests ──────────────────────────────────────────────────────────────

    public List<WeddingGuest> listGuests(String planId, String userId, String rsvpStatus) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        return rsvpStatus != null
            ? guestRepo.findByPlanIdAndRsvpStatus(planId, rsvpStatus)
            : guestRepo.findByPlanIdOrderByFullNameAsc(planId);
    }

    @Transactional
    public WeddingGuest addGuest(String planId, String userId, WeddingGuest guest) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        guest.setGuestId(UUID.randomUUID().toString());
        guest.setPlanId(planId);
        return guestRepo.save(guest);
    }

    @Transactional
    public List<WeddingGuest> importGuestsFromCsv(String planId, String userId, MultipartFile file) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        List<WeddingGuest> imported = new ArrayList<>();
        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            String[] headers = reader.readNext(); // skip header row
            if (headers == null) return imported;
            Map<String, Integer> idx = new HashMap<>();
            for (int i = 0; i < headers.length; i++) idx.put(headers[i].trim().toLowerCase(), i);

            String[] row;
            while ((row = reader.readNext()) != null) {
                if (row.length == 0 || row[0].isBlank()) continue;
                WeddingGuest g = WeddingGuest.builder()
                    .guestId(UUID.randomUUID().toString())
                    .planId(planId)
                    .fullName(getCol(row, idx, "full_name", "name"))
                    .email(getCol(row, idx, "email"))
                    .phone(getCol(row, idx, "phone"))
                    .rsvpStatus(getColOrDefault(row, idx, "rsvp_status", "pending"))
                    .mealChoice(getCol(row, idx, "meal_choice", "meal"))
                    .dietaryRestrictions(getCol(row, idx, "dietary_restrictions", "dietary"))
                    .build();
                String tableStr = getCol(row, idx, "table_number", "table");
                if (tableStr != null && !tableStr.isBlank()) {
                    try { g.setTableNumber(Integer.parseInt(tableStr.trim())); } catch (NumberFormatException ignored) {}
                }
                imported.add(guestRepo.save(g));
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV: " + e.getMessage(), e);
        }
        return imported;
    }

    @Transactional
    public WeddingGuest updateGuest(String planId, String guestId, String userId, WeddingGuest updates) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        WeddingGuest guest = guestRepo.findById(guestId)
            .orElseThrow(() -> new ResourceNotFoundException("Guest not found: " + guestId));
        if (updates.getFullName() != null) guest.setFullName(updates.getFullName());
        if (updates.getEmail() != null) guest.setEmail(updates.getEmail());
        if (updates.getPhone() != null) guest.setPhone(updates.getPhone());
        if (updates.getRsvpStatus() != null) guest.setRsvpStatus(updates.getRsvpStatus());
        if (updates.getMealChoice() != null) guest.setMealChoice(updates.getMealChoice());
        if (updates.getDietaryRestrictions() != null) guest.setDietaryRestrictions(updates.getDietaryRestrictions());
        if (updates.getTableNumber() != null) guest.setTableNumber(updates.getTableNumber());
        guest.setInvitationSent(updates.isInvitationSent() || guest.isInvitationSent());
        guest.setThankYouSent(updates.isThankYouSent() || guest.isThankYouSent());
        return guestRepo.save(guest);
    }

    @Transactional
    public void deleteGuest(String planId, String guestId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        guestRepo.deleteById(guestId);
    }

    public Map<String, Object> getGuestSummary(String planId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        long total = guestRepo.countByPlanId(planId);
        long attending = guestRepo.countByPlanIdAndRsvpStatus(planId, "attending");
        long declined = guestRepo.countByPlanIdAndRsvpStatus(planId, "declined");
        long pending = guestRepo.countByPlanIdAndRsvpStatus(planId, "pending");

        List<Object[]> mealRows = guestRepo.countMealChoicesForPlan(planId);
        Map<String, Long> mealTally = new LinkedHashMap<>();
        for (Object[] row : mealRows) mealTally.put((String) row[0], (Long) row[1]);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total);
        result.put("attending", attending);
        result.put("declined", declined);
        result.put("pending", pending);
        result.put("meal_tally", mealTally);
        return result;
    }

    // ─── Venues ──────────────────────────────────────────────────────────────

    public List<WeddingVenue> listVenues(String planId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        return venueRepo.findByPlanIdOrderByCreatedAtDesc(planId);
    }

    @Transactional
    public WeddingVenue addVenue(String planId, String userId, WeddingVenue venue) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        venue.setVenueId(UUID.randomUUID().toString());
        venue.setPlanId(planId);
        return venueRepo.save(venue);
    }

    @Transactional
    public WeddingVenue updateVenue(String planId, String venueId, String userId, WeddingVenue updates) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        WeddingVenue venue = venueRepo.findById(venueId)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + venueId));
        if (updates.getName() != null) venue.setName(updates.getName());
        if (updates.getAddress() != null) venue.setAddress(updates.getAddress());
        if (updates.getContactName() != null) venue.setContactName(updates.getContactName());
        if (updates.getContactPhone() != null) venue.setContactPhone(updates.getContactPhone());
        if (updates.getCapacity() != null) venue.setCapacity(updates.getCapacity());
        if (updates.getRentalFee() != null) venue.setRentalFee(updates.getRentalFee());
        if (updates.getIncludedItems() != null) venue.setIncludedItems(updates.getIncludedItems());
        if (updates.getNotes() != null) venue.setNotes(updates.getNotes());
        venue.setSelected(updates.isSelected());
        return venueRepo.save(venue);
    }

    @Transactional
    public void deleteVenue(String planId, String venueId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        venueRepo.deleteById(venueId);
    }

    // ─── Menu ────────────────────────────────────────────────────────────────

    public List<WeddingMenuItem> listMenu(String planId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        return menuRepo.findByPlanIdOrderByCourseAscNameAsc(planId);
    }

    @Transactional
    public WeddingMenuItem addMenuItem(String planId, String userId, WeddingMenuItem item) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        item.setItemId(UUID.randomUUID().toString());
        item.setPlanId(planId);
        return menuRepo.save(item);
    }

    @Transactional
    public WeddingMenuItem updateMenuItem(String planId, String itemId, String userId, WeddingMenuItem updates) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        WeddingMenuItem item = menuRepo.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("Menu item not found: " + itemId));
        if (updates.getCourse() != null) item.setCourse(updates.getCourse());
        if (updates.getName() != null) item.setName(updates.getName());
        if (updates.getDescription() != null) item.setDescription(updates.getDescription());
        if (updates.getDietaryInfo() != null) item.setDietaryInfo(updates.getDietaryInfo());
        item.setFinal(updates.isFinal());
        return menuRepo.save(item);
    }

    @Transactional
    public void deleteMenuItem(String planId, String itemId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        menuRepo.deleteById(itemId);
    }

    public Map<String, Object> getMealSummary(String planId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        List<WeddingMenuItem> items = menuRepo.findByPlanIdOrderByCourseAscNameAsc(planId);
        Map<String, Long> mealTally = new LinkedHashMap<>();
        guestRepo.countMealChoicesForPlan(planId).forEach(row -> mealTally.put((String) row[0], (Long) row[1]));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("menu_items", items);
        result.put("meal_tally", mealTally);
        return result;
    }

    // ─── Design Assets ───────────────────────────────────────────────────────

    public List<WeddingDesignAsset> listAssets(String planId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        return assetRepo.findByPlanIdOrderBySortOrderAsc(planId);
    }

    @Transactional
    public WeddingDesignAsset uploadAsset(String planId, String userId, MultipartFile file, String caption) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);

        String assetId = UUID.randomUUID().toString();
        String ext = getExtension(Objects.requireNonNullElse(file.getOriginalFilename(), "image.jpg"));
        String storedName = assetId + "." + ext;
        Path savePath = Paths.get(publicDir, "moodboard", planId, storedName);

        try {
            Files.createDirectories(savePath.getParent());
            file.transferTo(savePath.toFile());
        } catch (Exception e) {
            throw new RuntimeException("Failed to save image", e);
        }

        long maxOrder = assetRepo.findByPlanIdOrderBySortOrderAsc(planId).stream()
            .mapToLong(WeddingDesignAsset::getSortOrder).max().orElse(-1);

        WeddingDesignAsset asset = WeddingDesignAsset.builder()
            .assetId(assetId)
            .planId(planId)
            .imageUrl("/public/moodboard/" + planId + "/" + storedName)
            .caption(caption)
            .sortOrder((int) maxOrder + 1)
            .build();
        return assetRepo.save(asset);
    }

    @Transactional
    public WeddingDesignAsset updateAsset(String planId, String assetId, String userId, Map<String, Object> body) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        WeddingDesignAsset asset = assetRepo.findById(assetId)
            .orElseThrow(() -> new ResourceNotFoundException("Asset not found: " + assetId));
        if (body.containsKey("caption")) asset.setCaption((String) body.get("caption"));
        if (body.containsKey("sort_order")) asset.setSortOrder((int) body.get("sort_order"));
        return assetRepo.save(asset);
    }

    @Transactional
    public void deleteAsset(String planId, String assetId, String userId) {
        assertOwner(planRepo.findById(planId).orElseThrow(() -> new ResourceNotFoundException("Plan not found")), userId);
        WeddingDesignAsset asset = assetRepo.findById(assetId)
            .orElseThrow(() -> new ResourceNotFoundException("Asset not found: " + assetId));
        deleteFile(asset.getImageUrl());
        assetRepo.delete(asset);
    }

    // ─── Dashboard ───────────────────────────────────────────────────────────

    public Map<String, Object> getDashboard(String planId, String userId) {
        WeddingPlan plan = getPlanById(planId, userId);
        Map<String, Object> result = new LinkedHashMap<>();

        // Countdown
        long daysUntil = plan.getWeddingDate() != null
            ? ChronoUnit.DAYS.between(LocalDate.now(), plan.getWeddingDate())
            : -1;
        result.put("days_until_wedding", daysUntil);
        result.put("wedding_date", plan.getWeddingDate());
        result.put("theme", plan.getTheme());
        result.put("primary_color", plan.getPrimaryColor());
        result.put("secondary_color", plan.getSecondaryColor());

        // Budget summary
        result.put("budget", getBudgetSummary(planId, userId));

        // Guest summary
        result.put("guests", getGuestSummary(planId, userId));

        // Upcoming unpaid items (next 30 days or null due date)
        List<BudgetItem> allItems = budgetRepo.findByPlanIdOrderByCreatedAtDesc(planId);
        LocalDate cutoff = LocalDate.now().plusDays(30);
        List<BudgetItem> upcoming = allItems.stream()
            .filter(i -> !"paid".equals(i.getStatus()))
            .filter(i -> i.getDueDate() == null || !i.getDueDate().isAfter(cutoff))
            .sorted(Comparator.comparing(i -> i.getDueDate() != null ? i.getDueDate() : LocalDate.of(9999, 1, 1)))
            .limit(5)
            .toList();
        result.put("upcoming_payments", upcoming);

        // Venue count
        result.put("venue_count", venueRepo.findByPlanIdOrderByCreatedAtDesc(planId).size());

        return result;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void assertOwner(WeddingPlan plan, String userId) {
        if (!plan.getUserId().equals(userId)) {
            throw new SecurityException("Access denied");
        }
    }

    private void deleteFile(String url) {
        if (url == null) return;
        try {
            Path p = Paths.get(publicDir, url.replaceFirst("^/public/", ""));
            Files.deleteIfExists(p);
        } catch (Exception e) {
            log.warn("Could not delete file {}: {}", url, e.getMessage());
        }
    }

    private String getCol(String[] row, Map<String, Integer> idx, String... keys) {
        for (String key : keys) {
            Integer i = idx.get(key);
            if (i != null && i < row.length && !row[i].isBlank()) return row[i].trim();
        }
        return null;
    }

    private String getColOrDefault(String[] row, Map<String, Integer> idx, String key, String def) {
        String v = getCol(row, idx, key);
        return v != null ? v : def;
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return (dot >= 0 && dot < filename.length() - 1) ? filename.substring(dot + 1).toLowerCase() : "jpg";
    }
}
