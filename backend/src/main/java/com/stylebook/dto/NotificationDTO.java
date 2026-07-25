package com.stylebook.dto;

import com.stylebook.entity.Notification;
import com.stylebook.entity.NotificationChannel;
import com.stylebook.entity.NotificationType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Data
public class NotificationDTO {

    private String id;
    private String userId;
    private NotificationType type;
    private String title;
    private String body;
    private Map<String, Object> data;
    private boolean read;
    private Set<NotificationChannel> channelsSent = new LinkedHashSet<>();
    private LocalDateTime createdAt;

    public static NotificationDTO from(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId().toString());
        dto.setUserId(notification.getUserId().toString());
        dto.setType(notification.getType());
        dto.setTitle(notification.getTitle());
        dto.setBody(notification.getBody());
        dto.setData(notification.getData());
        dto.setRead(notification.isRead());
        dto.setChannelsSent(notification.getChannelsSent());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }
}
