package com.stylebook.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stylebook.dto.NotificationDTO;
import com.stylebook.entity.Notification;
import com.stylebook.entity.NotificationType;
import com.stylebook.event.NotificationCreatedEvent;
import com.stylebook.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Notification createNotification(UUID userId,
                                           NotificationType type,
                                           String title,
                                           String body,
                                           Map<String, Object> data,
                                           Set<String> channelsSent) {
        String payload = null;
        if (data != null && !data.isEmpty()) {
            try {
                payload = objectMapper.writeValueAsString(data);
            } catch (JsonProcessingException e) {
                log.warn("Unable to serialize notification data", e);
            }
        }

        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .body(body)
                .data(payload)
                .channelsSent(channelsSent != null ? new LinkedHashSet<>(channelsSent) : new LinkedHashSet<>())
                .build();

        Notification saved = notificationRepository.save(notification);
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                NotificationDTO.from(saved)
        );
        eventPublisher.publishEvent(new NotificationCreatedEvent(saved));
        return saved;
    }

    public Page<NotificationDTO> getNotifications(UUID userId, boolean unreadOnly, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Notification> notifications;
        if (unreadOnly) {
            notifications = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, pageable);
        } else {
            notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return notifications.map(NotificationDTO::from);
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public NotificationDTO markAsRead(UUID notificationId, UUID currentUserId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getUserId().equals(currentUserId)) {
            throw new IllegalArgumentException("Unauthorized");
        }
        notification.setRead(true);
        return NotificationDTO.from(notificationRepository.save(notification));
    }

    @Transactional
    public int markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unread);
        return unread.size();
    }
}
