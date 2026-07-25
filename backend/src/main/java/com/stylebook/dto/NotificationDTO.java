package com.stylebook.dto;

import com.stylebook.entity.Notification;
import com.stylebook.entity.NotificationType;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public class NotificationDTO {

    private UUID id;
    private UUID userId;
    private NotificationType type;
    private String title;
    private String body;
    private String data;
    private boolean isRead;
    private Set<String> channelsSent;
    private LocalDateTime createdAt;

    public static NotificationDTO from(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setUserId(notification.getUserId());
        dto.setType(notification.getType());
        dto.setTitle(notification.getTitle());
        dto.setBody(notification.getBody());
        dto.setData(notification.getData());
        dto.setRead(notification.isRead());
        dto.setChannelsSent(notification.getChannelsSent());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }

    public Set<String> getChannelsSent() {
        return channelsSent;
    }

    public void setChannelsSent(Set<String> channelsSent) {
        this.channelsSent = channelsSent;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
