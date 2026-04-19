package com.prani.repository;

import com.prani.entity.BudgetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BudgetItemRepository extends JpaRepository<BudgetItem, String> {
    List<BudgetItem> findByPlanIdOrderByCreatedAtDesc(String planId);

    @Query("SELECT b.category, SUM(b.estimatedCost), SUM(b.actualCost) FROM BudgetItem b WHERE b.planId = :planId GROUP BY b.category")
    List<Object[]> sumByCategoryForPlan(String planId);
}
