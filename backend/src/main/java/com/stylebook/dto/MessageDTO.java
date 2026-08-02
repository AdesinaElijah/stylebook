package com.stylebook.dto;

import com.stylebook.entity.Message;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A single chat message on the wire.
 *
 * <p>{@code mine} is resolved per request against the caller, so the app can render
 * left/right bubbles without knowing any user IDs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDTO {

    private UUID id;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;

    @NotBlank(message = "Message cannot be empty")
    @Size(max = 2000, message = "Message is too long")
    private String body;

    /** True when the caller sent this message. */
    private boolean mine;

    private LocalDateTime createdAt;

    public static MessageDTO from(Message message, UUID viewerId) {
        return MessageDTO.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getFullName())
                .body(message.getBody())
                .mine(message.getSender().getId().equals(viewerId))
                .createdAt(message.getCreatedAt())
                .build();
    }
}
