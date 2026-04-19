package com.prani.controller;

import com.prani.entity.Shift;
import com.prani.security.PraniAuthPrincipal;
import com.prani.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = staffService.listStaff(search, pageable);
        return ResponseEntity.ok(Map.of(
            "staff", result.getContent(),
            "total", result.getTotalElements(),
            "page", result.getNumber() + 1
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(staffService.getStats());
    }

    @GetMapping("/me/shifts")
    public ResponseEntity<?> myShifts(@AuthenticationPrincipal PraniAuthPrincipal principal) {
        return ResponseEntity.ok(staffService.getMyShifts(principal.getUserId()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getOne(@PathVariable String userId) {
        return ResponseEntity.ok(staffService.getById(userId));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<?> update(
        @PathVariable String userId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        return ResponseEntity.ok(
            staffService.updateProfile(userId, principal.getUserId(), principal.getRole(), body)
        );
    }

    @GetMapping("/shifts/all")
    public ResponseEntity<?> allShifts(
        @RequestParam(required = false) String event_id,
        @RequestParam(required = false) String date
    ) {
        return ResponseEntity.ok(staffService.getAllShifts(event_id, date));
    }

    @PostMapping("/shifts")
    public ResponseEntity<?> createShift(@RequestBody Shift shift) {
        return ResponseEntity.ok(staffService.createShift(shift));
    }

    @PutMapping("/shifts/{shiftId}")
    public ResponseEntity<?> updateShift(@PathVariable String shiftId, @RequestBody Shift updates) {
        return ResponseEntity.ok(staffService.updateShift(shiftId, updates));
    }

    @DeleteMapping("/shifts/{shiftId}")
    public ResponseEntity<?> deleteShift(
        @PathVariable String shiftId,
        @AuthenticationPrincipal PraniAuthPrincipal principal
    ) {
        staffService.deleteShift(shiftId, principal.getRole());
        return ResponseEntity.ok(Map.of("message", "Shift deleted"));
    }
}
