package com.stylebook.listener;

import com.stylebook.entity.NotificationChannel;
import com.stylebook.entity.NotificationType;
import com.stylebook.event.MessageCreatedEvent;
import com.stylebook.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class MessagingNotificationListener {

    private final NotificationService notificationService;

    @EventListener
    public void handleMessageCreated(MessageCreatedEvent event) {
        notificationService.createNotification(
                event.recipientUserId(),
                NotificationType.NEW_MESSAGE,
                "New message",
                event.messagePreview(),
                Map.of(
                        "conversationId", event.conversationId().toString(),
                        "senderId", event.senderId().toString()
                ),
                Set.of(NotificationChannel.IN_APP, NotificationChannel.PUSH)
        );
    }
}
