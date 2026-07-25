package com.stylebook.listener;

import com.stylebook.entity.NotificationChannel;
import com.stylebook.entity.NotificationType;
import com.stylebook.event.PostInteractionEvent;
import com.stylebook.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class SocialNotificationListener {

    private final NotificationService notificationService;

    @EventListener
    public void handlePostInteraction(PostInteractionEvent event) {
        NotificationType type = event.type();
        String title;
        String body;

        switch (type) {
            case POST_LIKE -> {
                title = "New like";
                body = event.actorName() + " liked your post";
            }
            case POST_COMMENT -> {
                title = "New comment";
                body = event.actorName() + " commented on your post";
            }
            case POST_SHARE -> {
                title = "Post shared";
                body = event.actorName() + " shared your post";
            }
            default -> {
                return;
            }
        }

        notificationService.createNotification(
                event.recipientUserId(),
                type,
                title,
                body,
                Map.of(
                        "postId", event.postId().toString(),
                        "actorUserId", event.actorUserId().toString(),
                        "actorName", event.actorName()
                ),
                Set.of(NotificationChannel.IN_APP, NotificationChannel.PUSH)
        );
    }
}
