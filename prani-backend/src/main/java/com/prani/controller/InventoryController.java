package com.prani.controller;

import com.prani.entity.InventoryItem;
import com.prani.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String condition,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = inventoryService.list(category, condition, search, pageable);
        return ResponseEntity.ok(Map.of(
            "items", result.getContent(),
            "total", result.getTotalElements(),
            "page", result.getNumber() + 1,
            "pages", result.getTotalPages()
        ));
    }

    @GetMapping("/categories")
    public ResponseEntity<?> categories() {
        return ResponseEntity.ok(inventoryService.getCategories());
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(inventoryService.getStats());
    }

    @GetMapping("/scan/{code}")
    public ResponseEntity<?> scan(@PathVariable String code) {
        return inventoryService.findByQrOrBarcode(code)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable String id) {
        return ResponseEntity.ok(inventoryService.getById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody InventoryItem item) {
        return ResponseEntity.ok(inventoryService.create(item));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody InventoryItem updates) {
        return ResponseEntity.ok(inventoryService.update(id, updates));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        inventoryService.softDelete(id);
        return ResponseEntity.ok(Map.of("message", "Item deactivated"));
    }
}
