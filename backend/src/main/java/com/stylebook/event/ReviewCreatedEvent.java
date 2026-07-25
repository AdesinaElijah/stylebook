package com.stylebook.event;

import java.util.UUID;

public record ReviewCreatedEvent(
        UUID recipientUserId,
        UUID reviewId,
        UUID shopId,
        String shopName,
        Integer rating,
        String comment
) {
}
