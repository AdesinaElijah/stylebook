package com.stylebook.event;

import com.stylebook.entity.Notification;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class NotificationCreatedEvent {
    private final Notification notification;
}
