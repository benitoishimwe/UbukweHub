package com.prani.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.prani.entity.Event;
import com.prani.entity.EventTask;
import com.prani.entity.EventType;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.EventRepository;
import com.prani.repository.EventTaskRepository;
import com.prani.repository.EventTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventTaskRepository eventTaskRepository;
    private final EventTypeRepository eventTypeRepository;

    public Page<Event> list(String status, String eventType, String search, Pageable pageable) {
        if (search != null && !search.isBlank())
            return eventRepository.search(search, pageable);
        if (status != null && eventType != null)
            return eventRepository.findByStatusAndEventTypeSlug(status, eventType, pageable);
        if (status != null)
            return eventRepository.findByStatus(status, pageable);
        if (eventType != null)
            return eventRepository.findByEventTypeSlug(eventType, pageable);
        return eventRepository.findAll(pageable);
    }

    public Event getById(String id) {
        return eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
    }

    @Transactional
    public Event create(Event event) {
        event.setEventId(UUID.randomUUID().toString());
        if (event.getEventTypeSlug() == null) event.setEventTypeSlug("wedding");
        if (event.getStatus() == null) event.setStatus("planning");

        // Pre-populate checklist/timeline from event type template if empty
        if ((event.getChecklist() == null || event.getChecklist().isEmpty())
            && event.getEventTypeSlug() != null) {
            eventTypeRepository.findBySlug(event.getEventTypeSlug()).ifPresent(et -> {
                event.setChecklist(et.getChecklistTemplate());
                event.setTimeline(et.getTimelineTemplate());
                event.setBudgetBreakdown(et.getBudgetCategories());
            });
        }
        return eventRepository.save(event);
    }

    @Transactional
    public Event update(String id, Event updates) {
        Event event = getById(id);
        if (updates.getName() != null) event.setName(updates.getName());
        if (updates.getEventDate() != null) event.setEventDate(updates.getEventDate());
        if (updates.getVenue() != null) event.setVenue(updates.getVenue());
        if (updates.getStatus() != null) event.setStatus(updates.getStatus());
        if (updates.getBudget() != null) event.setBudget(updates.getBudget());
        if (updates.getGuestCount() != null) event.setGuestCount(updates.getGuestCount());
        if (updates.getNotes() != null) event.setNotes(updates.getNotes());
        if (updates.getStaffIds() != null) event.setStaffIds(updates.getStaffIds());
        if (updates.getVendorIds() != null) event.setVendorIds(updates.getVendorIds());
        if (updates.getChecklist() != null) event.setChecklist(updates.getChecklist());
        if (updates.getTimeline() != null) event.setTimeline(updates.getTimeline());
        if (updates.getSeatingPlan() != null) event.setSeatingPlan(updates.getSeatingPlan());
        if (updates.getGuestList() != null) event.setGuestList(updates.getGuestList());
        if (updates.getBudgetBreakdown() != null) event.setBudgetBreakdown(updates.getBudgetBreakdown());
        if (updates.getGreatnesScore() != null) event.setGreatnesScore(updates.getGreatnesScore());
        return eventRepository.save(event);
    }

    @Transactional
    public void delete(String id) {
        eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        eventTaskRepository.deleteAllByEventId(id);
        eventRepository.deleteById(id);
    }

    public Map<String, Object> getStats() {
        long total = eventRepository.count();
        long planning = eventRepository.countByStatus("planning");
        long active = eventRepository.countByStatus("active");
        long completed = eventRepository.countByStatus("completed");
        long cancelled = eventRepository.countByStatus("cancelled");

        return Map.of(
            "total", total,
            "by_status", Map.of(
                "planning", planning,
                "active", active,
                "completed", completed,
                "cancelled", cancelled
            )
        );
    }

    public List<EventType> getAllEventTypes() {
        return eventTypeRepository.findAll();
    }

    // Tasks
    public List<EventTask> getTasks(String eventId) {
        getById(eventId); // verify exists
        return eventTaskRepository.findByEventIdOrderByCreatedAtDesc(eventId);
    }

    @Transactional
    public EventTask createTask(String eventId, EventTask task) {
        getById(eventId);
        task.setTaskId(UUID.randomUUID().toString());
        task.setEventId(eventId);
        return eventTaskRepository.save(task);
    }

    @Transactional
    public EventTask updateTask(String taskId, EventTask updates) {
        EventTask task = eventTaskRepository.findById(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (updates.getTitle() != null) task.setTitle(updates.getTitle());
        if (updates.getDescription() != null) task.setDescription(updates.getDescription());
        if (updates.getStatus() != null) task.setStatus(updates.getStatus());
        if (updates.getPriority() != null) task.setPriority(updates.getPriority());
        if (updates.getDueDate() != null) task.setDueDate(updates.getDueDate());
        if (updates.getAssignedTo() != null) task.setAssignedTo(updates.getAssignedTo());
        return eventTaskRepository.save(task);
    }

    @Transactional
    public void deleteTask(String taskId) {
        eventTaskRepository.findById(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        eventTaskRepository.deleteById(taskId);
    }

    // PDF report — mirrors Python FPDF report
    public byte[] generatePdfReport(String eventId) {
        Event event = getById(eventId);
        List<EventTask> tasks = eventTaskRepository.findByEventIdOrderByCreatedAtDesc(eventId);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);

            // Header
            doc.add(new Paragraph("PRANI — Event Report")
                .setBold().setFontSize(22).setFontColor(ColorConstants.DARK_GRAY));
            doc.add(new Paragraph(event.getName()).setFontSize(16).setBold());
            doc.add(new Paragraph("Date: " + event.getEventDate()));
            doc.add(new Paragraph("Venue: " + (event.getVenue() != null ? event.getVenue() : "—")));
            doc.add(new Paragraph("Status: " + event.getStatus().toUpperCase()));
            doc.add(new Paragraph("Event Type: " + (event.getEventTypeSlug() != null ? event.getEventTypeSlug() : "wedding")));
            if (event.getBudget() != null)
                doc.add(new Paragraph("Budget: RWF " + event.getBudget()));
            if (event.getGuestCount() != null)
                doc.add(new Paragraph("Guests: " + event.getGuestCount()));

            // Tasks summary
            if (!tasks.isEmpty()) {
                doc.add(new Paragraph("\nTasks").setBold().setFontSize(14));
                Table table = new Table(new float[]{3, 1, 1});
                table.addCell(new Cell().add(new Paragraph("Task").setBold()));
                table.addCell(new Cell().add(new Paragraph("Status").setBold()));
                table.addCell(new Cell().add(new Paragraph("Priority").setBold()));
                for (EventTask t : tasks) {
                    table.addCell(t.getTitle());
                    table.addCell(t.getStatus());
                    table.addCell(t.getPriority());
                }
                doc.add(table);
            }

            if (event.getNotes() != null && !event.getNotes().isBlank()) {
                doc.add(new Paragraph("\nNotes").setBold().setFontSize(14));
                doc.add(new Paragraph(event.getNotes()));
            }

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }
}
