package com.stylebook.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.stylebook.entity.Notification;
import com.stylebook.entity.NotificationPreference;
import com.stylebook.entity.NotificationType;
import com.stylebook.entity.UserDevice;
import com.stylebook.repository.NotificationPreferenceRepository;
import com.stylebook.repository.UserDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationPushService {

    private final UserDeviceRepository userDeviceRepository;
    private final NotificationPreferenceRepository notificationPreferenceRepository;

    @Value("${fcm.enabled:false}")
    private boolean fcmEnabled;

    @Value("${fcm.credentials.path:}")
    private String credentialsPath;

    private FirebaseMessaging firebaseMessaging;

    @PostConstruct
    public void init() {
        if (!fcmEnabled) {
            log.info("FCM push notifications are disabled");
            return;
        }

        try {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(new ClassPathResource(credentialsPath).getInputStream()))
                    .build();
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
            firebaseMessaging = FirebaseMessaging.getInstance();
        } catch (IOException e) {
            log.error("Unable to initialize FCM", e);
        }
    }

    @Transactional
    public UserDevice registerDevice(UUID userId, String fcmToken, String platform) {
        userDeviceRepository.findByFcmToken(fcmToken).ifPresent(existing -> {
            existing.setActive(true);
            existing.setPlatform(platform);
            existing.setUserId(userId);
            userDeviceRepository.save(existing);
        });

        List<UserDevice> existingDevices = userDeviceRepository.findByUserIdAndActiveTrue(userId);
        for (UserDevice device : existingDevices) {
            if (device.getFcmToken().equals(fcmToken)) {
                return device;
            }
        }

        UserDevice device = UserDevice.builder()
                .userId(userId)
                .fcmToken(fcmToken)
                .platform(platform)
                .active(true)
                .build();
        return userDeviceRepository.save(device);
    }

    @Transactional
    public void unregisterDevice(UUID userId, String fcmToken) {
        userDeviceRepository.findByFcmToken(fcmToken).ifPresent(device -> {
            if (device.getUserId().equals(userId)) {
                device.setActive(false);
                userDeviceRepository.save(device);
            }
        });
    }

    public void sendPush(Notification notification) {
        if (!fcmEnabled || firebaseMessaging == null) {
            return;
        }

        NotificationPreference preference = notificationPreferenceRepository.findByUserId(notification.getUserId()).orElseGet(NotificationPreference::new);
        if (!preference.isPushEnabled()) {
            return;
        }

        if (!shouldSendForType(notification.getType(), preference)) {
            return;
        }

        List<UserDevice> devices = userDeviceRepository.findByUserIdAndActiveTrue(notification.getUserId());
        if (devices.isEmpty()) {
            return;
        }

        Map<String, String> data = new HashMap<>();
        if (notification.getData() != null && !notification.getData().isBlank()) {
            data.put("payload", notification.getData());
        }
        data.put("notificationId", notification.getId().toString());
        data.put("type", notification.getType().name());

        for (UserDevice device : devices) {
            Message message = Message.builder()
                    .setToken(device.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(notification.getTitle())
                            .setBody(notification.getBody())
                            .build())
                    .putAllData(data)
                    .build();

            try {
                firebaseMessaging.send(message);
            } catch (FirebaseMessagingException e) {
                log.warn("Unable to send FCM notification for token {}", device.getFcmToken(), e);
                if (isInvalidToken(e)) {
                    deactivateDevice(device);
                }
            }
        }
    }

    private boolean shouldSendForType(NotificationType type, NotificationPreference preference) {
        return switch (type) {
            case BOOKING_REQUEST, BOOKING_CONFIRMED, BOOKING_CANCELLED -> preference.isBookingUpdatesEnabled();
            case NEW_MESSAGE -> preference.isMessageUpdatesEnabled();
            case NEW_REVIEW -> preference.isReviewUpdatesEnabled();
            case POST_LIKE, POST_COMMENT, POST_SHARE -> preference.isPostUpdatesEnabled();
            default -> true;
        };
    }

    private boolean isInvalidToken(FirebaseMessagingException exception) {
        String message = exception.getMessage() == null ? "" : exception.getMessage().toLowerCase();
        return message.contains("invalid registration token") || message.contains("registration token not registered") || message.contains("message rate exceeded") || message.contains("not found");
    }

    @Transactional
    public void deactivateDevice(UserDevice device) {
        device.setActive(false);
        userDeviceRepository.save(device);
    }
}
