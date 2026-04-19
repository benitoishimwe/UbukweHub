package com.prani.service;

import com.prani.entity.InventoryItem;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final QrCodeService qrCodeService;

    public Page<InventoryItem> list(String category, String condition, String search, Pageable pageable) {
        if (search != null && !search.isBlank())
            return inventoryRepository.search(search, pageable);
        if (category != null && condition != null)
            return inventoryRepository.findByCategoryAndConditionAndIsActiveTrue(category, condition, pageable);
        if (category != null)
            return inventoryRepository.findByCategoryAndIsActiveTrue(category, pageable);
        if (condition != null)
            return inventoryRepository.findByConditionAndIsActiveTrue(condition, pageable);
        return inventoryRepository.findByIsActiveTrue(pageable);
    }

    public java.util.List<String> getCategories() {
        return inventoryRepository.findDistinctCategories();
    }

    public InventoryItem getById(String id) {
        return inventoryRepository.findById(id)
            .filter(InventoryItem::getIsActive)
            .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));
    }

    public Optional<InventoryItem> findByQrOrBarcode(String code) {
        return inventoryRepository.findByQrCode(code)
            .or(() -> inventoryRepository.findByBarcode(code));
    }

    @Transactional
    public InventoryItem create(InventoryItem item) {
        String id = UUID.randomUUID().toString();
        item.setItemId(id);
        if (item.getQrCode() == null) {
            item.setQrCode("PRANI-" + id.substring(0, 8).toUpperCase());
        }
        if (item.getAvailable() == null) item.setAvailable(item.getQuantity());
        if (item.getRented() == null) item.setRented(0);
        if (item.getWashing() == null) item.setWashing(0);

        InventoryItem saved = inventoryRepository.save(item);

        // Generate QR image asynchronously — don't fail if it errors
        try {
            qrCodeService.generateItemQrCode(saved.getItemId());
        } catch (Exception e) {
            // Non-critical
        }
        return saved;
    }

    @Transactional
    public InventoryItem update(String id, InventoryItem updates) {
        InventoryItem item = getById(id);
        if (updates.getName() != null) item.setName(updates.getName());
        if (updates.getCategory() != null) item.setCategory(updates.getCategory());
        if (updates.getCondition() != null) item.setCondition(updates.getCondition());
        if (updates.getQuantity() != null) item.setQuantity(updates.getQuantity());
        if (updates.getRentalPrice() != null) item.setRentalPrice(updates.getRentalPrice());
        if (updates.getPurchasePrice() != null) item.setPurchasePrice(updates.getPurchasePrice());
        if (updates.getPhotos() != null) item.setPhotos(updates.getPhotos());
        return inventoryRepository.save(item);
    }

    @Transactional
    public void softDelete(String id) {
        InventoryItem item = getById(id);
        item.setIsActive(false);
        inventoryRepository.save(item);
    }

    public Map<String, Object> getStats() {
        long total = inventoryRepository.countActive();
        Long available = inventoryRepository.sumAvailable();
        Long rented = inventoryRepository.sumRented();
        long maintenance = inventoryRepository.countInMaintenance();

        return Map.of(
            "total", total,
            "available", available != null ? available : 0,
            "rented", rented != null ? rented : 0,
            "maintenance", maintenance
        );
    }

    // Called by TransactionService to adjust counts atomically
    @Transactional
    public void adjustCounts(String itemId, String transactionType, int qty) {
        InventoryItem item = inventoryRepository.findById(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + itemId));

        switch (transactionType) {
            case "rent" -> {
                item.setAvailable(Math.max(0, item.getAvailable() - qty));
                item.setRented(item.getRented() + qty);
            }
            case "return" -> {
                item.setAvailable(item.getAvailable() + qty);
                item.setRented(Math.max(0, item.getRented() - qty));
            }
            case "wash" -> {
                item.setAvailable(Math.max(0, item.getAvailable() - qty));
                item.setWashing(item.getWashing() + qty);
            }
            case "buy" -> {
                item.setQuantity(item.getQuantity() + qty);
                item.setAvailable(item.getAvailable() + qty);
            }
            case "lost", "damage" -> {
                item.setQuantity(Math.max(0, item.getQuantity() - qty));
                item.setAvailable(Math.max(0, item.getAvailable() - qty));
            }
        }
        inventoryRepository.save(item);
    }
}
