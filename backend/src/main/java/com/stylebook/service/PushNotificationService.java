package com.stylebook.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.stylebook.entity.Notification;
import com.stylebook.entity.NotificationPreferences;
import com.stylebook.entity.NotificationType;
import com.stylebook.entity.UserDevice;
import com.stylebook.repository.NotificationPreferencesRepository;
import com.stylebook.repository.UserDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final UserDeviceRepository userDeviceRepository;
    private final NotificationPreferencesRepository preferencesRepository;

    private FirebaseMessaging firebaseMessaging;

    @Transactional
    public void sendPushIfConfigured(Notification notification) {
        if (notification == null || notification.getUserId() == null) {
            return;
        }

        NotificationPreferences preferences = preferencesRepository.findByUserId(notification.getUserId()).orElse(null);
        if (preferences == null || !preferences.isPushEnabled()) {
            return;
        }

        if (!isTypeAllowed(notification.getType(), preferences)) {
            return;
        }

        List<UserDevice> devices = userDeviceRepository.findByUserIdAndActiveTrue(notification.getUserId());
        if (devices.isEmpty()) {
            return;
        }

        initFirebase();
        Map<String, String> data = new HashMap<>();
        if (notification.getData() != null) {
            notification.getData().forEach((key, value) -> data.put(key, String.valueOf(value)));
        }
        data.put("notificationId", notification.getId().toString());
        data.put("type", notification.getType().name());

        for (UserDevice device : devices) {
            try {
                Message message = Message.builder()
                        .setToken(device.getFcmToken())
                        .setNotification(Notification.builder()
                                .setTitle(notification.getTitle())
                                .setBody(notification.getBody())
                                .build())
                        .putAllData(data)
                        .build();

                firebaseMessaging.send(message);
            } catch (FirebaseMessagingException e) {
                log.warn("Failed to send push to token {}: {}", device.getFcmToken(), e.getMessage());
                if (isInvalidToken(e)) {
                    device.setActive(false);
                    userDeviceRepository.save(device);
                }
            }
        }
    }

    private boolean isTypeAllowed(NotificationType type, NotificationPreferences preferences) {
        return switch (type) {
            case BOOKING_REQUEST, BOOKING_CONFIRMED, BOOKING_CANCELLED -> preferences.isBookingEnabled();
            case NEW_MESSAGE -> preferences.isMessageEnabled();
            case NEW_REVIEW -> preferences.isReviewEnabled();
            case POST_LIKE, POST_COMMENT, POST_SHARE -> preferences.isSocialEnabled();
            case PAYMENT_RECEIVED -> preferences.isPaymentEnabled();
        };
    }

    private boolean isInvalidToken(FirebaseMessagingException e) {
        String message = e.getMessage() == null ? "" : e.getMessage().toLowerCase();
        return message.contains("messaging/invalid-registration-token")
                || message.contains("messaging/registration-token-not-registered")
                || message.contains("messaging/invalid-argument")
                || message.contains("not found")
                || message.contains("expired");
    }

    private synchronized void initFirebase() {
        if (firebaseMessaging != null) {
            return;
        }

        try {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(new ClassPathResource("firebase-service-account.json").getInputStream()))
                        .build();
                FirebaseApp.initializeApp(options);
            }
            firebaseMessaging = FirebaseMessaging.getInstance();
        } catch (IOException e) {
            log.warn("FCM init failed: {}", e.getMessage());
        }
    }
}
