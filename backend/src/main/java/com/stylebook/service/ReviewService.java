package com.stylebook.service;

import com.stylebook.dto.ReviewDTO;
import com.stylebook.entity.Booking;
import com.stylebook.entity.Review;
import com.stylebook.entity.Shop;
import com.stylebook.entity.User;
import com.stylebook.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final BookingRepository bookingRepository;

    @Transactional
    public ReviewDTO.ReviewResponse createReview(UUID customerId,
                                                  ReviewDTO.CreateReviewRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Booking booking;
        if (request.getBookingId() != null && !request.getBookingId().isEmpty()) {
            booking = bookingRepository.findById(UUID.fromString(request.getBookingId()))
                    .orElseThrow(() -> new RuntimeException("Booking not found"));
        } else {
            // No booking specified (inline review from shop profile):
            // attach the customer's most recent unreviewed visit to this shop
            if (request.getShopId() == null || request.getShopId().isEmpty()) {
                throw new RuntimeException("Shop is required");
            }
            UUID shopId = UUID.fromString(request.getShopId());
            booking = bookingRepository
                    .findByCustomerOrderByBookingDateDescBookingTimeDesc(customer)
                    .stream()
                    .filter(b -> b.getShop().getId().equals(shopId))
                    .filter(b -> b.getStatus() == Booking.BookingStatus.CONFIRMED ||
                                 b.getStatus() == Booking.BookingStatus.COMPLETED)
                    .filter(b -> !reviewRepository.existsByBookingId(b.getId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException(
                            "You can only review shops you have visited. Book an appointment first!"));
        }

        if (!booking.getCustomer().getId().equals(customerId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (booking.getStatus() != Booking.BookingStatus.CONFIRMED &&
            booking.getStatus() != Booking.BookingStatus.COMPLETED) {
            throw new RuntimeException("Can only review confirmed or completed bookings");
        }

        if (reviewRepository.existsByBookingId(booking.getId())) {
            throw new RuntimeException("You have already reviewed this booking");
        }

        if (request.getRating() < 1 || request.getRating() > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }

        Review review = Review.builder()
                .customer(customer)
                .shop(booking.getShop())
                .booking(booking)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        reviewRepository.save(review);
        updateShopRating(booking.getShop());

        return ReviewDTO.ReviewResponse.from(review);
    }

    @Transactional
    public ReviewDTO.ReviewResponse addOwnerReply(UUID ownerId, UUID reviewId,
                                                   ReviewDTO.OwnerReplyRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!review.getShop().getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Unauthorized");
        }

        review.setOwnerReply(request.getReply());
        review.setOwnerRepliedAt(LocalDateTime.now());
        reviewRepository.save(review);

        return ReviewDTO.ReviewResponse.from(review);
    }

    @Transactional
    public void deleteOwnerReply(UUID ownerId, UUID reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!review.getShop().getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Unauthorized");
        }

        review.setOwnerReply(null);
        review.setOwnerRepliedAt(null);
        reviewRepository.save(review);
    }

    public List<ReviewDTO.ReviewResponse> getShopReviews(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        return reviewRepository.findByShopOrderByCreatedAtDesc(shop)
                .stream()
                .map(ReviewDTO.ReviewResponse::from)
                .collect(Collectors.toList());
    }

    public List<ReviewDTO.ReviewResponse> getMyReviews(UUID customerId) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return reviewRepository.findByCustomerOrderByCreatedAtDesc(customer)
                .stream()
                .map(ReviewDTO.ReviewResponse::from)
                .collect(Collectors.toList());
    }

    public ReviewDTO.RatingBreakdown getShopRatingBreakdown(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));

        ReviewDTO.RatingBreakdown breakdown = new ReviewDTO.RatingBreakdown();
        breakdown.setAverageRating(shop.getAvgRating());
        breakdown.setTotalReviews(shop.getReviewCount());
        breakdown.setFiveStar(reviewRepository.countByShopAndRating(shop, 5));
        breakdown.setFourStar(reviewRepository.countByShopAndRating(shop, 4));
        breakdown.setThreeStar(reviewRepository.countByShopAndRating(shop, 3));
        breakdown.setTwoStar(reviewRepository.countByShopAndRating(shop, 2));
        breakdown.setOneStar(reviewRepository.countByShopAndRating(shop, 1));

        return breakdown;
    }

    private void updateShopRating(Shop shop) {
        Double avgRating = reviewRepository.getAverageRatingByShop(shop);
        List<Review> reviews = reviewRepository.findByShopOrderByCreatedAtDesc(shop);
        shop.setAvgRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
        shop.setReviewCount(reviews.size());
        shopRepository.save(shop);
    }
}