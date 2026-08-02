package com.stylebook.listener;

import com.stylebook.entity.NotificationChannel;
import com.stylebook.entity.NotificationType;
import com.stylebook.event.PaymentReceivedEvent;
import com.stylebook.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * Sends the customer a receipt once the shop records their payment.
 *
 * <p>The notification goes to the customer rather than the owner: the owner is the one who
 * pressed the button, so telling them what they just did is noise. The customer is the one
 * who benefits from written confirmation of what they paid and for what.
 */
@Component
@RequiredArgsConstructor
public class PaymentNotificationListener {

    private final NotificationService notificationService;

    @EventListener
    public void handlePaymentReceived(PaymentReceivedEvent event) {
        String amount = String.format("GHS %.2f", event.amount());

        notificationService.createNotification(
                event.recipientUserId(),
                NotificationType.PAYMENT_RECEIVED,
                "Payment confirmed",
                amount + " for " + event.serviceName() + " at " + event.shopName(),
                Map.of(
                        "bookingId", event.bookingId().toString(),
                        "shopName", event.shopName(),
                        "serviceName", event.serviceName(),
                        "amount", event.amount()
                ),
                Set.of(NotificationChannel.IN_APP, NotificationChannel.PUSH)
        );
    }
}
