package com.stylebook.listener;

import com.stylebook.entity.NotificationChannel;
import com.stylebook.entity.NotificationType;
import com.stylebook.event.ReviewCreatedEvent;
import com.stylebook.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class ReviewNotificationListener {

    private final NotificationService notificationService;

    @EventListener
    public void handleReviewCreated(ReviewCreatedEvent event) {
        notificationService.createNotification(
                event.recipientUserId(),
                NotificationType.NEW_REVIEW,
                "New review",
                "You received a new review for your shop",
                Map.of(
                        "reviewId", event.reviewId().toString(),
                        "shopId", event.shopId().toString(),
                        "shopName", event.shopName(),
                        "rating", event.rating(),
                        "comment", event.comment()
                ),
                Set.of(NotificationChannel.IN_APP, NotificationChannel.PUSH)
        );
    }
}
