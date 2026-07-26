package com.stylebook.service;

import com.stylebook.entity.Notification;
import com.stylebook.entity.NotificationChannel;
import com.stylebook.entity.NotificationType;
import com.stylebook.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Notification createNotification(UUID userId,
                                           NotificationType type,
                                           String title,
                                           String body,
                                           Map<String, Object> data,
                                           Set<NotificationChannel> channels) {
        Set<NotificationChannel> resolvedChannels = channels == null || channels.isEmpty()
                ? Set.of(NotificationChannel.IN_APP)
                : new LinkedHashSet<>(channels);

        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .body(body)
                .data(data != null ? data : new HashMap<>())
                .channelsSent(resolvedChannels)
                .build();

        Notification saved = notificationRepository.save(notification);
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, saved);
        return saved;
    }

    public Page<Notification> getNotifications(UUID userId, Boolean unread, Pageable pageable) {
        if (Boolean.TRUE.equals(unread)) {
            return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, pageable);
        }
        if (Boolean.FALSE.equals(unread)) {
            return notificationRepository.findByUserIdAndIsReadTrueOrderByCreatedAtDesc(userId, pageable);
        }
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long countUnread(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public Notification markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public int markAllAsRead(UUID userId) {
        return notificationRepository.markAllAsRead(userId);
    }
}
