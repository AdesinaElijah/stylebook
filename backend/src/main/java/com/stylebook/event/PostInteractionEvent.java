package com.stylebook.event;

import com.stylebook.entity.NotificationType;

import java.util.UUID;

public record PostInteractionEvent(
        NotificationType type,
        UUID recipientUserId,
        UUID actorUserId,
        UUID postId,
        String postCaption,
        String actorName
) {
}
