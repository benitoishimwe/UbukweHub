package com.prani.repository;

import com.prani.entity.EventTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventTaskRepository extends JpaRepository<EventTask, String> {
    List<EventTask> findByEventIdOrderByCreatedAtDesc(String eventId);
    List<EventTask> findByEventIdAndStatus(String eventId, String status);
    void deleteAllByEventId(String eventId);
}
