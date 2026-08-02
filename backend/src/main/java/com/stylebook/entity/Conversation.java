package com.stylebook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A single ongoing chat thread between one customer and one shop.
 *
 * <p>There is at most one conversation per customer/shop pair — messaging a shop a second
 * time reopens the existing thread rather than starting a fresh one, which is enforced by
 * the unique constraint below.
 *
 * <p>The last-message fields are denormalised copies. The inbox list needs a preview and a
 * sort key for every thread, and carrying them here avoids an N+1 query per conversation.
 */
@Entity
@Table(
        name = "conversations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_conversation_customer_shop",
                columnNames = {"customer_id", "shop_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    /** Preview text for the inbox list. Denormalised from the newest message. */
    @Column(length = 500)
    private String lastMessage;

    /** Sort key for the inbox list. Denormalised from the newest message. */
    private LocalDateTime lastMessageAt;

    /** Messages the customer hasn't opened yet. */
    @Column(nullable = false)
    @Builder.Default
    private int customerUnread = 0;

    /** Messages the shop owner hasn't opened yet. */
    @Column(nullable = false)
    @Builder.Default
    private int ownerUnread = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
