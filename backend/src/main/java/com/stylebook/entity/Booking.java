package com.stylebook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    @Column(nullable = false)
    private LocalDate bookingDate;

    @Column(nullable = false)
    private LocalTime bookingTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status = BookingStatus.PENDING;

    // Auto-confirm after 45 seconds if owner doesn't act
    private LocalDateTime autoConfirmAt;

    // True when the customer has rescheduled this booking
    @Column(columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean rescheduled = false;

    // --- Payment ---
    // Money changes hands at the shop, not in the app: cash, a MoMo transfer or a card
    // terminal. The owner records what they took, and the customer gets a receipt.

    // Deliberately nullable at the DB level: ddl-auto=update can't add a NOT NULL column
    // to a table that already has bookings in it. Always set in code, and readers treat
    // null as UNPAID for rows that predate this column.
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(20) default 'UNPAID'")
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;

    /** What was actually collected, which may differ from the listed service price. */
    @Column(precision = 10, scale = 2)
    private BigDecimal amountPaid;

    private LocalDateTime paidAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public enum BookingStatus {
        PENDING, CONFIRMED, CANCELLED, COMPLETED
    }

    public enum PaymentStatus {
        UNPAID, PAID
    }

    /** How the customer settled up, for the shop's own records. */
    public enum PaymentMethod {
        CASH, MOBILE_MONEY, CARD
    }
}