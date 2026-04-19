package com.prani.service;

import com.prani.entity.Transaction;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final InventoryService inventoryService;

    public Page<Transaction> list(String type, String itemId, String eventId, String staffId, Pageable pageable) {
        if (type != null) return transactionRepository.findByType(type, pageable);
        if (itemId != null) return transactionRepository.findByItemId(itemId, pageable);
        if (eventId != null) return transactionRepository.findByEventId(eventId, pageable);
        if (staffId != null) return transactionRepository.findByStaffId(staffId, pageable);
        return transactionRepository.findAll(pageable);
    }

    public Transaction getById(String id) {
        return transactionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + id));
    }

    @Transactional
    public Transaction create(Transaction tx) {
        tx.setTransactionId(UUID.randomUUID().toString());
        Transaction saved = transactionRepository.save(tx);

        // Auto-update inventory counts (mirrors Python update_inventory_counts)
        if (tx.getItemId() != null && tx.getQuantity() != null) {
            inventoryService.adjustCounts(tx.getItemId(), tx.getType(), tx.getQuantity());
        }
        return saved;
    }

    @Transactional
    public Transaction update(String id, Transaction updates) {
        Transaction tx = getById(id);
        if (updates.getEventId() != null) tx.setEventId(updates.getEventId());
        if (updates.getEventName() != null) tx.setEventName(updates.getEventName());
        if (updates.getReturnDate() != null) tx.setReturnDate(updates.getReturnDate());
        if (updates.getPhoto() != null) tx.setPhoto(updates.getPhoto());
        return transactionRepository.save(tx);
    }

    public Map<String, Object> getStats() {
        long rentCount = transactionRepository.countByType("rent");
        long returnCount = transactionRepository.countByType("return");
        long washCount = transactionRepository.countByType("wash");
        long buyCount = transactionRepository.countByType("buy");
        long lostCount = transactionRepository.countByType("lost");
        long damageCount = transactionRepository.countByType("damage");

        return Map.of(
            "by_type", Map.of(
                "rent", rentCount,
                "return", returnCount,
                "wash", washCount,
                "buy", buyCount,
                "lost", lostCount,
                "damage", damageCount
            ),
            "total", rentCount + returnCount + washCount + buyCount + lostCount + damageCount
        );
    }
}
