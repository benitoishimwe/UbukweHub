package com.prani.controller;

import com.prani.entity.Event;
import com.prani.entity.EventTask;
import com.prani.security.PraniAuthPrincipal;
import com.prani.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String event_type,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = eventService.list(status, event_type, search, pageable);
        return ResponseEntity.ok(Map.of(
            "events", result.getContent(),
            "total", result.getTotalElements(),
            "page", result.getNumber() + 1
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(eventService.getStats());
    }

    @GetMapping("/types")
    public ResponseEntity<?> eventTypes() {
        return ResponseEntity.ok(eventService.getAllEventTypes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable String id) {
        return ResponseEntity.ok(eventService.getById(id));
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<byte[]> report(@PathVariable String id) {
        byte[] pdf = eventService.generatePdfReport(id);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=event-report.pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Event event,
                                     @AuthenticationPrincipal PraniAuthPrincipal principal) {
        return ResponseEntity.ok(eventService.create(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Event updates) {
        return ResponseEntity.ok(eventService.update(id, updates));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        eventService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Event deleted"));
    }

    // Task sub-resource
    @GetMapping("/{id}/tasks")
    public ResponseEntity<?> getTasks(@PathVariable String id) {
        return ResponseEntity.ok(eventService.getTasks(id));
    }

    @PostMapping("/{id}/tasks")
    public ResponseEntity<?> createTask(@PathVariable String id,
                                         @RequestBody EventTask task,
                                         @AuthenticationPrincipal PraniAuthPrincipal principal) {
        task.setCreatedBy(principal.getUserId());
        return ResponseEntity.ok(eventService.createTask(id, task));
    }

    @PutMapping("/{id}/tasks/{taskId}")
    public ResponseEntity<?> updateTask(@PathVariable String id,
                                         @PathVariable String taskId,
                                         @RequestBody EventTask updates) {
        return ResponseEntity.ok(eventService.updateTask(taskId, updates));
    }

    @DeleteMapping("/{id}/tasks/{taskId}")
    public ResponseEntity<?> deleteTask(@PathVariable String id, @PathVariable String taskId) {
        eventService.deleteTask(taskId);
        return ResponseEntity.ok(Map.of("message", "Task deleted"));
    }

    // JSONB field updates (guests, seating, budget)
    @PutMapping("/{id}/guests")
    public ResponseEntity<?> updateGuests(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Event event = eventService.getById(id);
        Event update = new Event();
        update.setGuestList((java.util.List<java.util.Map<String, Object>>) body.get("guest_list"));
        return ResponseEntity.ok(eventService.update(id, update));
    }

    @PutMapping("/{id}/seating")
    public ResponseEntity<?> updateSeating(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Event update = new Event();
        update.setSeatingPlan(body);
        return ResponseEntity.ok(eventService.update(id, update));
    }

    @PutMapping("/{id}/budget")
    public ResponseEntity<?> updateBudget(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Event update = new Event();
        update.setBudgetBreakdown((java.util.List<java.util.Map<String, Object>>) body.get("budget_breakdown"));
        return ResponseEntity.ok(eventService.update(id, update));
    }
}
