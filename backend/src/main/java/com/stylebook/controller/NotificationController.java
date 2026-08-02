package com.stylebook.controller;

import com.stylebook.dto.NotificationDTO;
import com.stylebook.dto.NotificationPreferencesDTO;
import com.stylebook.dto.UserDeviceDTO;
import com.stylebook.entity.Notification;
import com.stylebook.service.NotificationPreferencesService;
import com.stylebook.service.NotificationService;
import com.stylebook.service.UserDeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationPreferencesService preferencesService;
    private final UserDeviceService userDeviceService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> listNotifications(
            @RequestParam UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean unread) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notifications = notificationService.getNotifications(userId, unread, pageable);

        return ResponseEntity.ok(Map.of(
                "content", notifications.getContent().stream().map(NotificationDTO::from).toList(),
                "page", notifications.getNumber(),
                "size", notifications.getSize(),
                "totalPages", notifications.getTotalPages(),
                "totalElements", notifications.getTotalElements(),
                "hasNext", notifications.hasNext()
        ));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(@RequestParam UUID userId) {
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.countUnread(userId)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationDTO> markRead(@PathVariable UUID id) {
        return ResponseEntity.ok(NotificationDTO.from(notificationService.markAsRead(id)));
    }

    @PatchMapping("/mark-all-read")
    public ResponseEntity<Map<String, Integer>> markAllRead(@RequestParam UUID userId) {
        int updated = notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    /**
     * The caller's own notification settings. Creates the all-enabled default row if the
     * user has never changed anything.
     */
    @GetMapping("/preferences")
    public ResponseEntity<NotificationPreferencesDTO> getPreferences(
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(
                NotificationPreferencesDTO.from(preferencesService.getOrCreate(userId)));
    }

    /**
     * Partial update: only non-null fields are applied, so the app can send a single
     * toggle rather than the whole settings object.
     */
    @PutMapping("/preferences")
    public ResponseEntity<NotificationPreferencesDTO> updatePreferences(
            @AuthenticationPrincipal UUID userId,
            @RequestBody NotificationPreferencesDTO changes) {
        return ResponseEntity.ok(
                NotificationPreferencesDTO.from(preferencesService.update(userId, changes)));
    }

    /**
     * Registers this device's Expo push token against the signed-in user. The app calls
     * this after every login, since tokens rotate and a handset can change hands.
     */
    @PostMapping("/devices")
    public ResponseEntity<UserDeviceDTO> registerDevice(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody UserDeviceDTO request) {
        return ResponseEntity.ok(UserDeviceDTO.from(
                userDeviceService.register(userId, request.getToken(), request.getPlatform())));
    }

    /** Stops push to this device. Called on sign-out. */
    @DeleteMapping("/devices")
    public ResponseEntity<Void> unregisterDevice(@RequestParam String token) {
        userDeviceService.unregister(token);
        return ResponseEntity.noContent().build();
    }
}
