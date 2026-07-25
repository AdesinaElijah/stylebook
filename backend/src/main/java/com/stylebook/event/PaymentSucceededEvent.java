package com.stylebook.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@RequiredArgsConstructor
public class PaymentSucceededEvent {
    private final UUID recipientUserId;
    private final UUID bookingId;
    private final BigDecimal amount;
}
