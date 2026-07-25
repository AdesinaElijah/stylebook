package com.stylebook.event;

import com.stylebook.entity.Booking;

import java.util.UUID;

public record BookingStatusChangedEvent(
        UUID bookingId,
        UUID recipientUserId,
        UUID customerId,
        UUID shopId,
        String shopName,
        String serviceName,
        Booking.BookingStatus status
) {
}
