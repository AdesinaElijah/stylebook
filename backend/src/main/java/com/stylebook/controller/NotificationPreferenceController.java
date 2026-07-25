package com.stylebook.controller;

import com.stylebook.entity.NotificationPreference;
import com.stylebook.service.NotificationPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications/preferences")
@RequiredArgsConstructor
public class NotificationPreferenceController {

    private final NotificationPreferenceService notificationPreferenceService;

    @GetMapping
    public ResponseEntity<NotificationPreference> getPreferences(Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(notificationPreferenceService.getOrCreate(userId));
    }

    @PutMapping
    public ResponseEntity<NotificationPreference> updatePreferences(
            @RequestBody Map<String, Object> updates,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(notificationPreferenceService.updatePreferences(userId, updates));
    }
}
