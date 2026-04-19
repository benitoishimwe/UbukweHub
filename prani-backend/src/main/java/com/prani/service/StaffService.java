package com.prani.service;

import com.prani.entity.Shift;
import com.prani.entity.User;
import com.prani.exception.ResourceNotFoundException;
import com.prani.exception.UnauthorizedException;
import com.prani.repository.ShiftRepository;
import com.prani.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffService {

    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;

    public Page<User> listStaff(String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            // Filter in-memory for simplicity; add @Query for production scale
            return userRepository.findByIsActiveTrue(pageable);
        }
        return userRepository.findByIsActiveTrue(pageable);
    }

    public User getById(String userId) {
        return userRepository.findById(userId)
            .filter(User::getIsActive)
            .orElseThrow(() -> new ResourceNotFoundException("Staff not found: " + userId));
    }

    @Transactional
    public User updateProfile(String targetId, String requesterId, String requesterRole, Map<String, Object> updates) {
        if (!targetId.equals(requesterId) && !"admin".equals(requesterRole)) {
            throw new UnauthorizedException("Cannot update another user's profile");
        }
        User user = getById(targetId);
        if (updates.containsKey("name")) user.setName((String) updates.get("name"));
        if (updates.containsKey("availability")) user.setAvailability((String) updates.get("availability"));
        if (updates.containsKey("skills")) user.setSkills((List<String>) updates.get("skills"));
        if (updates.containsKey("certifications")) user.setCertifications((List<String>) updates.get("certifications"));
        return userRepository.save(user);
    }

    public Map<String, Object> getStats() {
        long total = userRepository.countByRoleAndActive("staff");
        long onShift = shiftRepository.findAll().stream()
            .filter(s -> "active".equals(s.getStatus())).count();
        double utilization = total > 0 ? (onShift * 100.0 / total) : 0;
        return Map.of("total", total, "on_shift", onShift,
            "utilization_percent", Math.round(utilization));
    }

    // Shifts
    public List<Shift> getAllShifts(String eventId, String date) {
        if (eventId != null && date != null)
            return shiftRepository.findByEventIdAndDate(eventId, date);
        if (eventId != null)
            return shiftRepository.findByEventId(eventId);
        return shiftRepository.findAll();
    }

    public List<Shift> getMyShifts(String userId) {
        return shiftRepository.findByStaffId(userId);
    }

    @Transactional
    public Shift createShift(Shift shift) {
        shift.setShiftId(UUID.randomUUID().toString());
        if (shift.getStatus() == null) shift.setStatus("scheduled");
        return shiftRepository.save(shift);
    }

    @Transactional
    public Shift updateShift(String shiftId, Shift updates) {
        Shift shift = shiftRepository.findById(shiftId)
            .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));
        if (updates.getRole() != null) shift.setRole(updates.getRole());
        if (updates.getDate() != null) shift.setDate(updates.getDate());
        if (updates.getStartTime() != null) shift.setStartTime(updates.getStartTime());
        if (updates.getEndTime() != null) shift.setEndTime(updates.getEndTime());
        if (updates.getStatus() != null) shift.setStatus(updates.getStatus());
        if (updates.getTasks() != null) shift.setTasks(updates.getTasks());
        return shiftRepository.save(shift);
    }

    @Transactional
    public void deleteShift(String shiftId, String requesterRole) {
        if (!"admin".equals(requesterRole)) throw new UnauthorizedException("Admin only");
        shiftRepository.findById(shiftId)
            .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));
        shiftRepository.deleteById(shiftId);
    }
}
