package com.prani.service;

import com.prani.entity.Vendor;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorRepository vendorRepository;

    public Page<Vendor> list(String category, String search, Pageable pageable) {
        if (category != null) return vendorRepository.findByCategoryAndIsActiveTrue(category, pageable);
        if (search != null) return vendorRepository.findByNameContainingIgnoreCaseAndIsActiveTrue(search, pageable);
        return vendorRepository.findByIsActiveTrue(pageable);
    }

    public Vendor getById(String id) {
        return vendorRepository.findById(id)
            .filter(Vendor::getIsActive)
            .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + id));
    }

    @Transactional
    public Vendor create(Vendor vendor) {
        vendor.setVendorId(UUID.randomUUID().toString());
        if (vendor.getIsActive() == null) vendor.setIsActive(true);
        if (vendor.getIsVerified() == null) vendor.setIsVerified(false);
        return vendorRepository.save(vendor);
    }

    @Transactional
    public Vendor update(String id, Vendor updates) {
        Vendor vendor = getById(id);
        if (updates.getName() != null) vendor.setName(updates.getName());
        if (updates.getCategory() != null) vendor.setCategory(updates.getCategory());
        if (updates.getContactName() != null) vendor.setContactName(updates.getContactName());
        if (updates.getEmail() != null) vendor.setEmail(updates.getEmail());
        if (updates.getPhone() != null) vendor.setPhone(updates.getPhone());
        if (updates.getLocation() != null) vendor.setLocation(updates.getLocation());
        if (updates.getIsVerified() != null) vendor.setIsVerified(updates.getIsVerified());
        return vendorRepository.save(vendor);
    }

    @Transactional
    public void softDelete(String id) {
        Vendor vendor = getById(id);
        vendor.setIsActive(false);
        vendorRepository.save(vendor);
    }
}
