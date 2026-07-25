package com.stylebook.event;

import com.stylebook.entity.NotificationType;
import com.stylebook.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;

    @EventListener
    public void handleBookingCreated(BookingCreatedEvent event) {
        var booking = event.getBooking();
        notificationService.createNotification(
                booking.getShop().getOwner().getId(),
                NotificationType.BOOKING_REQUEST,
                "New booking request",
                "You have a new booking request from " + booking.getCustomer().getFullName(),
                Map.of(
                        "bookingId", booking.getId().toString(),
                        "customerId", booking.getCustomer().getId().toString(),
                        "shopId", booking.getShop().getId().toString()
                ),
                Set.of("IN_APP", "PUSH")
        );
    }

    @EventListener
    public void handleBookingStatusChanged(BookingStatusChangedEvent event) {
        var booking = event.getBooking();
        NotificationType type = switch (booking.getStatus()) {
            case CONFIRMED -> NotificationType.BOOKING_CONFIRMED;
            case CANCELLED -> NotificationType.BOOKING_CANCELLED;
            default -> null;
        };

        if (type == null) {
            return;
        }

        UUID recipientId = booking.getCustomer().getId();
        String title = switch (type) {
            case BOOKING_CONFIRMED -> "Booking confirmed";
            case BOOKING_CANCELLED -> "Booking cancelled";
            default -> "Booking update";
        };
        String body = switch (type) {
            case BOOKING_CONFIRMED -> "Your booking at " + booking.getShop().getName() + " has been confirmed.";
            case BOOKING_CANCELLED -> "Your booking at " + booking.getShop().getName() + " has been cancelled.";
            default -> "Your booking status has changed.";
        };

        notificationService.createNotification(
                recipientId,
                type,
                title,
                body,
                Map.of(
                        "bookingId", booking.getId().toString(),
                        "shopId", booking.getShop().getId().toString(),
                        "status", booking.getStatus().name()
                ),
                Set.of("IN_APP", "PUSH")
        );
    }

    @EventListener
    public void handleMessageSent(MessageSentEvent event) {
        notificationService.createNotification(
                event.getRecipientUserId(),
                NotificationType.NEW_MESSAGE,
                "New message",
                "You received a new message",
                Map.of(
                        "senderUserId", event.getSenderUserId().toString(),
                        "content", event.getContent()
                ),
                Set.of("IN_APP", "PUSH")
        );
    }

    @EventListener
    public void handlePaymentSucceeded(PaymentSucceededEvent event) {
        notificationService.createNotification(
                event.getRecipientUserId(),
                NotificationType.PAYMENT_RECEIVED,
                "Payment received",
                "A payment of " + event.getAmount() + " was received.",
                Map.of(
                        "bookingId", event.getBookingId().toString(),
                        "amount", event.getAmount().toString()
                ),
                Set.of("IN_APP", "PUSH")
        );
    }

    @EventListener
    public void handleReviewCreated(ReviewCreatedEvent event) {
        var review = event.getReview();
        notificationService.createNotification(
                review.getShop().getOwner().getId(),
                NotificationType.NEW_REVIEW,
                "New review",
                "You received a new review from " + review.getCustomer().getFullName(),
                Map.of(
                        "reviewId", review.getId().toString(),
                        "shopId", review.getShop().getId().toString(),
                        "rating", review.getRating()
                ),
                Set.of("IN_APP")
        );
    }

    @EventListener
    public void handlePostLiked(PostLikedEvent event) {
        notificationService.createNotification(
                event.getRecipientUserId(),
                NotificationType.POST_LIKE,
                "Your post was liked",
                "Someone liked your post",
                Map.of(
                        "postId", event.getPostId().toString(),
                        "actorUserId", event.getActorUserId().toString()
                ),
                Set.of("IN_APP")
        );
    }

    @EventListener
    public void handlePostCommented(PostCommentedEvent event) {
        notificationService.createNotification(
                event.getRecipientUserId(),
                NotificationType.POST_COMMENT,
                "New comment on your post",
                "Someone commented on your post",
                Map.of(
                        "postId", event.getPostId().toString(),
                        "actorUserId", event.getActorUserId().toString(),
                        "comment", event.getComment()
                ),
                Set.of("IN_APP")
        );
    }

    @EventListener
    public void handlePostShared(PostSharedEvent event) {
        notificationService.createNotification(
                event.getRecipientUserId(),
                NotificationType.POST_SHARE,
                "Your post was shared",
                "Someone shared your post",
                Map.of(
                        "postId", event.getPostId().toString(),
                        "actorUserId", event.getActorUserId().toString()
                ),
                Set.of("IN_APP")
        );
    }
}
