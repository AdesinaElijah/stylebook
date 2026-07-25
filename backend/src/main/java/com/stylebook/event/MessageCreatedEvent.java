package com.stylebook.event;

import java.util.UUID;

public record MessageCreatedEvent(
        UUID recipientUserId,
        UUID senderId,
        UUID conversationId,
        String messagePreview
) {
}
