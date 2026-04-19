package com.prani.controller;

import com.prani.entity.Transaction;
import com.prani.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String item_id,
        @RequestParam(required = false) String event_id,
        @RequestParam(required = false) String staff_id,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = transactionService.list(type, item_id, event_id, staff_id, pageable);
        return ResponseEntity.ok(Map.of(
            "transactions", result.getContent(),
            "total", result.getTotalElements(),
            "page", result.getNumber() + 1
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(transactionService.getStats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable String id) {
        return ResponseEntity.ok(transactionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Transaction tx) {
        return ResponseEntity.ok(transactionService.create(tx));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Transaction updates) {
        return ResponseEntity.ok(transactionService.update(id, updates));
    }
}
