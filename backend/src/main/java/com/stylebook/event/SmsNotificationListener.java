package com.stylebook.event;

import com.stylebook.entity.Notification;
import com.stylebook.entity.NotificationPreference;
import com.stylebook.entity.NotificationType;
import com.stylebook.entity.User;
import com.stylebook.repository.NotificationPreferenceRepository;
import com.stylebook.repository.UserRepository;
import com.stylebook.service.SmsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
public class SmsNotificationListener {

    private final SmsService smsService;
    private final NotificationPreferenceRepository notificationPreferenceRepository;
    private final UserRepository userRepository;

    private static final Set<NotificationType> ALLOWED_TYPES = Set.of(
            NotificationType.PAYMENT_RECEIVED,
            NotificationType.BOOKING_CONFIRMED,
            NotificationType.BOOKING_CANCELLED,
            NotificationType.PROMO
    );

    @EventListener
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        Notification notification = event.getNotification();
        if (!ALLOWED_TYPES.contains(notification.getType())) {
            return;
        }

        NotificationPreference preference = notificationPreferenceRepository.findByUserId(notification.getUserId()).orElse(null);
        if (preference == null || !preference.isSmsEnabled()) {
            return;
        }

        if (preference.isSmsTransactionalOnly() && !isTransactional(notification.getType())) {
            return;
        }

        String phoneNumber = resolvePhoneNumber(notification);
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return;
        }

        String body = notification.getTitle() + ": " + notification.getBody();
        smsService.sendSms(phoneNumber, body);
    }

    private boolean isTransactional(NotificationType type) {
        return switch (type) {
            case PAYMENT_RECEIVED, BOOKING_CONFIRMED, BOOKING_CANCELLED -> true;
            default -> false;
        };
    }

    private String resolvePhoneNumber(Notification notification) {
        User user = userRepository.findById(notification.getUserId()).orElse(null);
        return user != null ? user.getPhone() : null;
    }
}
