package com.stylebook.service;

import com.stylebook.dto.ConversationDTO;
import com.stylebook.dto.MessageDTO;
import com.stylebook.entity.Conversation;
import com.stylebook.entity.Message;
import com.stylebook.entity.Shop;
import com.stylebook.entity.User;
import com.stylebook.event.MessageCreatedEvent;
import com.stylebook.repository.ConversationRepository;
import com.stylebook.repository.MessageRepository;
import com.stylebook.repository.ShopRepository;
import com.stylebook.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Chat between customers and shops.
 *
 * <p>Delivery happens on two paths. A STOMP broadcast reaches anyone with the thread open
 * right now, and a {@link MessageCreatedEvent} feeds the notification pipeline for
 * everyone else — that second path is what turns into a push notification, subject to the
 * recipient's settings.
 *
 * <p>Every method that touches a conversation checks membership first. Conversation IDs
 * are guessable enough that "you have the ID" is not authorisation.
 */
@Service
@RequiredArgsConstructor
public class MessagingService {

    /** How much of a message to keep as the inbox preview. */
    private static final int PREVIEW_LENGTH = 120;

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Opens the customer's thread with a shop, creating it on first contact.
     *
     * <p>Idempotent: tapping "Message" repeatedly returns the same thread rather than
     * scattering the history across duplicates.
     */
    @Transactional
    public ConversationDTO openConversation(UUID customerId, UUID shopId) {
        Conversation conversation = conversationRepository
                .findByCustomerIdAndShopId(customerId, shopId)
                .orElseGet(() -> {
                    User customer = userRepository.findById(customerId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    Shop shop = shopRepository.findById(shopId)
                            .orElseThrow(() -> new RuntimeException("Shop not found"));

                    return conversationRepository.save(Conversation.builder()
                            .customer(customer)
                            .shop(shop)
                            .lastMessageAt(LocalDateTime.now())
                            .build());
                });

        return ConversationDTO.from(conversation, customerId);
    }

    /**
     * The caller's inbox. Customers see threads they started; owners see threads for the
     * shop they own.
     */
    @Transactional
    public List<ConversationDTO> listConversations(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Conversation> conversations;
        if (user.getRole() == User.UserRole.OWNER) {
            Shop shop = shopRepository.findByOwnerAndIsActiveTrue(user)
                    .orElseThrow(() -> new RuntimeException("You don't have an active shop"));
            conversations = conversationRepository.findByShopIdOrderByLastMessageAtDesc(shop.getId());
        } else {
            conversations = conversationRepository.findByCustomerIdOrderByLastMessageAtDesc(userId);
        }

        return conversations.stream()
                .map(conversation -> ConversationDTO.from(conversation, userId))
                .toList();
    }

    /** Full thread history. Opening it also clears the caller's unread badge. */
    @Transactional
    public List<MessageDTO> getMessages(UUID conversationId, UUID userId) {
        Conversation conversation = requireMembership(conversationId, userId);
        clearUnreadFor(conversation, userId);

        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(message -> MessageDTO.from(message, userId))
                .toList();
    }

    /**
     * Sends a message, then notifies the other party over STOMP and through the
     * notification pipeline.
     */
    @Transactional
    public MessageDTO sendMessage(UUID conversationId, UUID senderId, String body) {
        Conversation conversation = requireMembership(conversationId, senderId);

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Message message = messageRepository.save(Message.builder()
                .conversation(conversation)
                .sender(sender)
                .body(body.trim())
                .build());

        boolean senderIsCustomer = conversation.getCustomer().getId().equals(senderId);

        conversation.setLastMessage(preview(body));
        conversation.setLastMessageAt(LocalDateTime.now());
        if (senderIsCustomer) {
            conversation.setOwnerUnread(conversation.getOwnerUnread() + 1);
        } else {
            conversation.setCustomerUnread(conversation.getCustomerUnread() + 1);
        }
        conversationRepository.save(conversation);

        UUID recipientId = senderIsCustomer
                ? conversation.getShop().getOwner().getId()
                : conversation.getCustomer().getId();

        // Live update for anyone with this thread open. Sent from the recipient's
        // perspective so `mine` is correct on their screen.
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + conversationId,
                MessageDTO.from(message, recipientId));

        // Feeds MessagingNotificationListener -> in-app notification + push.
        eventPublisher.publishEvent(new MessageCreatedEvent(
                recipientId,
                senderId,
                conversationId,
                preview(body)
        ));

        return MessageDTO.from(message, senderId);
    }

    /** Clears the caller's unread badge without loading the whole thread. */
    @Transactional
    public void markRead(UUID conversationId, UUID userId) {
        clearUnreadFor(requireMembership(conversationId, userId), userId);
    }

    /** Total unread messages across all the caller's threads, for the inbox tab badge. */
    @Transactional
    public int totalUnread(UUID userId) {
        return listConversations(userId).stream()
                .mapToInt(ConversationDTO::getUnreadCount)
                .sum();
    }

    /**
     * Loads a conversation and confirms the caller is one of its two participants.
     *
     * @throws RuntimeException if the thread doesn't exist or the caller isn't part of it
     */
    private Conversation requireMembership(UUID conversationId, UUID userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        boolean isCustomer = conversation.getCustomer().getId().equals(userId);
        boolean isOwner = conversation.getShop().getOwner().getId().equals(userId);

        if (!isCustomer && !isOwner) {
            throw new RuntimeException("You are not part of this conversation");
        }
        return conversation;
    }

    private void clearUnreadFor(Conversation conversation, UUID userId) {
        if (conversation.getCustomer().getId().equals(userId)) {
            conversation.setCustomerUnread(0);
        } else {
            conversation.setOwnerUnread(0);
        }
        conversationRepository.save(conversation);
    }

    private String preview(String body) {
        String trimmed = body.trim();
        return trimmed.length() <= PREVIEW_LENGTH
                ? trimmed
                : trimmed.substring(0, PREVIEW_LENGTH) + "…";
    }
}
