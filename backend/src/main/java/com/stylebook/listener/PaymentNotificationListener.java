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

@Component
@RequiredArgsConstructor
public class PaymentNotificationListener {

    private final NotificationService notificationService;

    @EventListener
    public void handlePaymentReceived(PaymentReceivedEvent event) {
        notificationService.createNotification(
                event.recipientUserId(),
                NotificationType.PAYMENT_RECEIVED,
                "Payment received",
                "You received a payment for " + event.serviceName(),
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
