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
    private final NotificationPreferencesService preferencesService;
    private final PushNotificationService pushNotificationService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Records a notification and fans it out over the requested channels.
     *
     * <p>The user's settings are honoured here rather than at each call site, so listeners
     * stay dumb: if the user has muted this category the method returns {@code null} and
     * nothing is stored or delivered. Muting push alone does not suppress the record — the
     * PUSH channel is simply dropped and the notification still reaches the in-app bell.
     *
     * @return the saved notification, or {@code null} if the user has muted this category
     */
    @Transactional
    public Notification createNotification(UUID userId,
                                           NotificationType type,
                                           String title,
                                           String body,
                                           Map<String, Object> data,
                                           Set<NotificationChannel> channels) {
        if (!preferencesService.allowsType(userId, type)) {
            return null;
        }

        Set<NotificationChannel> resolvedChannels = channels == null || channels.isEmpty()
                ? Set.of(NotificationChannel.IN_APP)
                : new LinkedHashSet<>(channels);

        // Master push switch: strip PUSH but keep the in-app record.
        if (resolvedChannels.contains(NotificationChannel.PUSH)
                && !preferencesService.allowsPush(userId)) {
            resolvedChannels = new LinkedHashSet<>(resolvedChannels);
            resolvedChannels.remove(NotificationChannel.PUSH);
            if (resolvedChannels.isEmpty()) {
                resolvedChannels.add(NotificationChannel.IN_APP);
            }
        }

        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .body(body)
                .data(data != null ? data : new HashMap<>())
                .channelsSent(resolvedChannels)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Live update for anyone with the app open.
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, saved);

        // And a real push for anyone who isn't.
        if (resolvedChannels.contains(NotificationChannel.PUSH)) {
            Map<String, Object> pushData = new HashMap<>(saved.getData() != null ? saved.getData() : Map.of());
            pushData.put("notificationId", saved.getId().toString());
            pushData.put("type", type.name());
            pushNotificationService.sendToUser(userId, title, body, pushData);
        }

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
