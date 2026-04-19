package com.prani.service;

import com.prani.entity.*;
import com.prani.exception.ResourceNotFoundException;
import com.prani.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class VendorMarketplaceService {

    private final VendorRepository vendorRepository;
    private final VendorProfileRepository profileRepository;
    private final VendorPortfolioRepository portfolioRepository;
    private final VendorReviewRepository reviewRepository;
    private final VendorInquiryRepository inquiryRepository;
    private final VendorFavoriteRepository favoriteRepository;

    public Page<Vendor> browseVendors(String category, String search, Pageable pageable) {
        if (category != null && search != null)
            return vendorRepository.findByCategoryAndIsActiveTrue(category, pageable);
        if (category != null)
            return vendorRepository.findByCategoryAndIsActiveTrue(category, pageable);
        if (search != null)
            return vendorRepository.findByNameContainingIgnoreCaseAndIsActiveTrue(search, pageable);
        return vendorRepository.findByIsActiveTrue(pageable);
    }

    public Map<String, Object> getVendorDetail(String vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + vendorId));

        Optional<VendorProfile> profile = profileRepository.findByVendorId(vendorId);
        List<VendorPortfolio> portfolio = portfolioRepository.findByVendorIdOrderByDisplayOrderAsc(vendorId);
        Double avgRating = reviewRepository.avgRatingByVendorId(vendorId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("vendor_id", vendor.getVendorId());
        result.put("name", vendor.getName());
        result.put("category", vendor.getCategory());
        result.put("contact_name", vendor.getContactName());
        result.put("email", vendor.getEmail());
        result.put("phone", vendor.getPhone());
        result.put("location", vendor.getLocation());
        result.put("rating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : null);
        result.put("is_verified", vendor.getIsVerified());
        result.put("portfolio_count", portfolio.size());
        result.put("portfolio", portfolio.stream().map(p -> Map.of(
            "portfolio_id", p.getPortfolioId(),
            "image_url", p.getImageUrl(),
            "caption", p.getCaption() != null ? p.getCaption() : "",
            "event_type", p.getEventType() != null ? p.getEventType() : ""
        )).toList());

        profile.ifPresent(pr -> {
            result.put("bio", pr.getBio());
            result.put("website", pr.getWebsite());
            result.put("instagram", pr.getInstagram());
            result.put("price_min", pr.getPriceMin());
            result.put("price_max", pr.getPriceMax());
            result.put("currency", pr.getCurrency());
            result.put("packages", pr.getPackages());
            result.put("service_areas", pr.getServiceAreas());
            result.put("tags", pr.getTags());
        });
        return result;
    }

    @Transactional
    public VendorInquiry sendInquiry(String vendorId, String userId, String message,
                                      java.math.BigDecimal budget, java.time.LocalDate eventDate,
                                      String eventId) {
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));

        VendorInquiry inquiry = VendorInquiry.builder()
            .inquiryId(UUID.randomUUID().toString())
            .vendorId(vendorId)
            .userId(userId)
            .eventId(eventId)
            .message(message)
            .budget(budget)
            .eventDate(eventDate)
            .status("pending")
            .build();
        return inquiryRepository.save(inquiry);
    }

    @Transactional
    public VendorReview addReview(String vendorId, String userId, String eventId,
                                   int rating, String title, String body) {
        if (reviewRepository.existsByVendorIdAndUserId(vendorId, userId)) {
            throw new IllegalArgumentException("You have already reviewed this vendor");
        }
        VendorReview review = VendorReview.builder()
            .reviewId(UUID.randomUUID().toString())
            .vendorId(vendorId)
            .userId(userId)
            .eventId(eventId)
            .rating(rating)
            .title(title)
            .body(body)
            .isVerified(eventId != null)
            .build();
        VendorReview saved = reviewRepository.save(review);

        // Update vendor's average rating
        Double avg = reviewRepository.avgRatingByVendorId(vendorId);
        if (avg != null) {
            vendorRepository.findById(vendorId).ifPresent(v -> {
                v.setRating(Math.round(avg * 10.0) / 10.0);
                vendorRepository.save(v);
            });
        }
        return saved;
    }

    @Transactional
    public void addFavorite(String userId, String vendorId) {
        if (favoriteRepository.existsByUserIdAndVendorId(userId, vendorId)) return;
        favoriteRepository.save(VendorFavorite.builder()
            .favoriteId(UUID.randomUUID().toString())
            .userId(userId)
            .vendorId(vendorId)
            .build());
    }

    @Transactional
    public void removeFavorite(String userId, String vendorId) {
        favoriteRepository.deleteByUserIdAndVendorId(userId, vendorId);
    }

    public List<String> getFavoriteVendorIds(String userId) {
        return favoriteRepository.findByUserId(userId).stream()
            .map(VendorFavorite::getVendorId).toList();
    }

    public Page<VendorReview> getReviews(String vendorId, Pageable pageable) {
        return reviewRepository.findByVendorId(vendorId, pageable);
    }

    public List<String> getCategories() {
        return List.of("catering", "decor", "music", "photography", "transport",
            "venue", "makeup", "flowers", "lighting", "entertainment");
    }
}
