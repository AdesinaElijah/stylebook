package com.stylebook.event;

import java.util.UUID;

public record PaymentReceivedEvent(
        UUID recipientUserId,
        UUID bookingId,
        String shopName,
        String serviceName,
        Double amount
) {
}
