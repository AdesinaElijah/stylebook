package com.stylebook.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
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
public class NotificationPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(nullable = false)
    @Builder.Default
    private boolean pushEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean bookingEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean messageEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean reviewEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean socialEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean paymentEnabled = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
