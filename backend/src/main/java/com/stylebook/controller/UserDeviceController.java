package com.stylebook.controller;

import com.stylebook.entity.UserDevice;
import com.stylebook.service.NotificationPushService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications/devices")
@RequiredArgsConstructor
public class UserDeviceController {

    private final NotificationPushService notificationPushService;

    @PostMapping
    public ResponseEntity<Map<String, String>> registerDevice(
            @RequestBody Map<String, String> payload,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        String fcmToken = payload.get("fcmToken");
        String platform = payload.getOrDefault("platform", "ANDROID");
        if (fcmToken == null || fcmToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "fcmToken is required"));
        }

        UserDevice device = notificationPushService.registerDevice(userId, fcmToken, platform);
        return ResponseEntity.ok(Map.of("message", "Device registered", "deviceId", device.getId().toString()));
    }

    @DeleteMapping
    public ResponseEntity<Map<String, String>> unregisterDevice(
            @RequestBody Map<String, String> payload,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        String fcmToken = payload.get("fcmToken");
        if (fcmToken == null || fcmToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "fcmToken is required"));
        }

        notificationPushService.unregisterDevice(userId, fcmToken);
        return ResponseEntity.ok(Map.of("message", "Device removed"));
    }
}
