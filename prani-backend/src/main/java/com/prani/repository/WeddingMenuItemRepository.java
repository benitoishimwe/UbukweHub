package com.prani.repository;

import com.prani.entity.WeddingMenuItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WeddingMenuItemRepository extends JpaRepository<WeddingMenuItem, String> {
    List<WeddingMenuItem> findByPlanIdOrderByCourseAscNameAsc(String planId);
    List<WeddingMenuItem> findByPlanIdAndCourse(String planId, String course);
}
