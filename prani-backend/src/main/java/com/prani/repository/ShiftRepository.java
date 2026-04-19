package com.prani.repository;

import com.prani.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, String> {
    List<Shift> findByEventId(String eventId);
    List<Shift> findByStaffId(String staffId);
    List<Shift> findByEventIdAndDate(String eventId, String date);
}
