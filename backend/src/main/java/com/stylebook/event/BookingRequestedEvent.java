package com.stylebook.event;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record BookingRequestedEvent(
        UUID bookingId,
        UUID recipientUserId,
        UUID customerId,
        UUID shopId,
        String shopName,
        String serviceName,
        LocalDate bookingDate,
        LocalTime bookingTime
) {
}
