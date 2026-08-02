package com.stylebook.controller;

import com.stylebook.dto.ConversationDTO;
import com.stylebook.dto.MessageDTO;
import com.stylebook.service.MessagingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Chat endpoints.
 *
 * <p>The caller is always taken from the JWT rather than the request body — who you are
 * is not something the client gets to assert. Membership checks live in
 * {@link MessagingService}.
 */
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessagingService messagingService;

    /** The caller's inbox, newest activity first. */
    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDTO>> listConversations(
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(messagingService.listConversations(userId));
    }

    /**
     * Opens (or reopens) the caller's thread with a shop. Customers call this from the
     * shop profile's "Message" button.
     */
    @PostMapping("/conversations")
    public ResponseEntity<ConversationDTO> openConversation(
            @AuthenticationPrincipal UUID userId,
            @RequestBody Map<String, UUID> request) {
        UUID shopId = request.get("shopId");
        if (shopId == null) {
            throw new RuntimeException("shopId is required");
        }
        return ResponseEntity.ok(messagingService.openConversation(userId, shopId));
    }

    /** Full thread history. Also clears the caller's unread badge. */
    @GetMapping("/conversations/{id}")
    public ResponseEntity<List<MessageDTO>> getMessages(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(messagingService.getMessages(id, userId));
    }

    /** Sends a message to the other party in this thread. */
    @PostMapping("/conversations/{id}")
    public ResponseEntity<MessageDTO> sendMessage(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody MessageDTO request) {
        return ResponseEntity.ok(
                messagingService.sendMessage(id, userId, request.getBody()));
    }

    /** Clears the caller's unread badge without fetching the thread. */
    @PatchMapping("/conversations/{id}/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id) {
        messagingService.markRead(id, userId);
        return ResponseEntity.noContent().build();
    }

    /** Total unread across all threads, for the inbox tab badge. */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Integer>> unreadCount(
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(Map.of("unreadCount", messagingService.totalUnread(userId)));
    }
}
