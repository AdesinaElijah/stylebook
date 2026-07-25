package com.stylebook.controller;

import com.stylebook.dto.NotificationDTO;
import com.stylebook.entity.Notification;
import com.stylebook.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

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
}
