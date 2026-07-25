package com.stylebook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notification_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID userId;

    @Column(nullable = false)
    @Builder.Default
    private boolean inAppEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean pushEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean smsEnabled = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean smsTransactionalOnly = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean bookingUpdatesEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean messageUpdatesEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean reviewUpdatesEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean postUpdatesEnabled = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
