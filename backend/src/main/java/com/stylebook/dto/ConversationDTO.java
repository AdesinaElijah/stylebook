package com.stylebook.dto;

import com.stylebook.entity.Conversation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An inbox row, rendered from the caller's point of view.
 *
 * <p>A conversation looks different depending on who's reading it: the customer sees the
 * shop, the owner sees the customer. Rather than shipping both sides and making the app
 * work out which is which, {@link #from} resolves the counterparty and the caller's own
 * unread count server-side.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDTO {

    private UUID id;

    /** The shop this thread belongs to — used to open the shop profile from chat. */
    private UUID shopId;

    /** Display name of whoever the caller is talking to. */
    private String otherPartyName;

    /** Avatar for the other party, or null if they don't have one. */
    private String otherPartyImageUrl;

    private String lastMessage;
    private LocalDateTime lastMessageAt;

    /** Unread count for the caller specifically, not the thread total. */
    private int unreadCount;

    public static ConversationDTO from(Conversation conversation, UUID viewerId) {
        boolean viewerIsCustomer = conversation.getCustomer().getId().equals(viewerId);

        return ConversationDTO.builder()
                .id(conversation.getId())
                .shopId(conversation.getShop().getId())
                .otherPartyName(viewerIsCustomer
                        ? conversation.getShop().getName()
                        : conversation.getCustomer().getFullName())
                .otherPartyImageUrl(viewerIsCustomer
                        ? conversation.getShop().getCoverImageUrl()
                        : null)
                .lastMessage(conversation.getLastMessage())
                .lastMessageAt(conversation.getLastMessageAt())
                .unreadCount(viewerIsCustomer
                        ? conversation.getCustomerUnread()
                        : conversation.getOwnerUnread())
                .build();
    }
}
