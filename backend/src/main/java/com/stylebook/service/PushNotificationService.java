package com.stylebook.service;

import com.stylebook.entity.UserDevice;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Delivers push notifications through Expo's push service.
 *
 * <p>Expo sits in front of FCM and APNs and accepts a plain HTTPS POST, so the app needs
 * no Firebase credentials and no native config. Sends are fire-and-forget on a background
 * thread: a push failing is never a reason to fail the booking, review or message that
 * triggered it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    /** Expo accepts up to 100 messages per request. */
    private static final int BATCH_SIZE = 100;

    private final UserDeviceService userDeviceService;

    /**
     * Short timeouts on purpose. This runs on a bounded pool, so a hung connection to
     * Expo would otherwise park a worker thread indefinitely and eventually starve every
     * other notification on the box.
     */
    private final RestTemplate restTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Pushes to every device the user is signed in on.
     *
     * <p>Runs asynchronously and swallows transport errors, so callers can treat this as
     * best-effort.
     */
    @Async
    public void sendToUser(UUID userId, String title, String body, Map<String, Object> data) {
        List<UserDevice> devices = userDeviceService.activeDevicesFor(userId);
        if (devices.isEmpty()) {
            return;
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        for (UserDevice device : devices) {
            Map<String, Object> message = new HashMap<>();
            message.put("to", device.getFcmToken());
            message.put("title", title);
            message.put("body", body);
            message.put("sound", "default");
            message.put("data", data != null ? data : Map.of());
            messages.add(message);
        }

        for (int start = 0; start < messages.size(); start += BATCH_SIZE) {
            List<Map<String, Object>> batch =
                    messages.subList(start, Math.min(start + BATCH_SIZE, messages.size()));
            postBatch(batch, userId);
        }
    }

    private void postBatch(List<Map<String, Object>> batch, UUID userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        try {
            restTemplate.postForEntity(
                    EXPO_PUSH_URL,
                    new HttpEntity<>(batch, headers),
                    String.class);
        } catch (RestClientException ex) {
            // Expected in dev (no real tokens) and during Expo outages. Not worth failing over.
            log.warn("Push delivery to user {} failed: {}", userId, ex.getMessage());
        }
    }
}
