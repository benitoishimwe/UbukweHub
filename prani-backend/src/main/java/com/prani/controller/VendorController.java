package com.prani.controller;

import com.prani.entity.Vendor;
import com.prani.service.VendorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = vendorService.list(category, search, pageable);
        return ResponseEntity.ok(Map.of(
            "vendors", result.getContent(),
            "total", result.getTotalElements(),
            "page", result.getNumber() + 1
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable String id) {
        return ResponseEntity.ok(vendorService.getById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Vendor vendor) {
        return ResponseEntity.ok(vendorService.create(vendor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Vendor updates) {
        return ResponseEntity.ok(vendorService.update(id, updates));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        vendorService.softDelete(id);
        return ResponseEntity.ok(Map.of("message", "Vendor deactivated"));
    }
}
