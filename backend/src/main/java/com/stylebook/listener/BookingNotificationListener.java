package com.stylebook.listener;

import com.stylebook.entity.NotificationChannel;
import com.stylebook.entity.NotificationType;
import com.stylebook.event.BookingRequestedEvent;
import com.stylebook.event.BookingStatusChangedEvent;
import com.stylebook.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class BookingNotificationListener {

    private final NotificationService notificationService;

    @EventListener
    public void handleBookingRequested(BookingRequestedEvent event) {
        notificationService.createNotification(
                event.recipientUserId(),
                NotificationType.BOOKING_REQUEST,
                "New booking request",
                "You have a new booking request from " + event.shopName(),
                Map.of(
                        "bookingId", event.bookingId().toString(),
                        "customerId", event.customerId().toString(),
                        "shopId", event.shopId().toString(),
                        "shopName", event.shopName(),
                        "serviceName", event.serviceName(),
                        "bookingDate", event.bookingDate().toString(),
                        "bookingTime", event.bookingTime().toString()
                ),
                Set.of(NotificationChannel.IN_APP, NotificationChannel.PUSH)
        );
    }

    @EventListener
    public void handleBookingStatusChanged(BookingStatusChangedEvent event) {
        NotificationType type = switch (event.status()) {
            case CONFIRMED -> NotificationType.BOOKING_CONFIRMED;
            case CANCELLED -> NotificationType.BOOKING_CANCELLED;
            default -> null;
        };

        if (type == null) {
            return;
        }

        notificationService.createNotification(
                event.recipientUserId(),
                type,
                type == NotificationType.BOOKING_CONFIRMED ? "Booking confirmed" : "Booking cancelled",
                type == NotificationType.BOOKING_CONFIRMED
                        ? "Your booking at " + event.shopName() + " has been confirmed"
                        : "Your booking at " + event.shopName() + " has been cancelled",
                Map.of(
                        "bookingId", event.bookingId().toString(),
                        "shopId", event.shopId().toString(),
                        "shopName", event.shopName(),
                        "serviceName", event.serviceName()
                ),
                Set.of(NotificationChannel.IN_APP, NotificationChannel.PUSH)
        );
    }
}
