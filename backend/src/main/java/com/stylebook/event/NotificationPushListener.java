package com.stylebook.event;

import com.stylebook.entity.Notification;
import com.stylebook.service.NotificationPushService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NotificationPushListener {

    private final NotificationPushService notificationPushService;

    @EventListener
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        Notification notification = event.getNotification();
        notificationPushService.sendPush(notification);
    }
}
