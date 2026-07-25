package com.stylebook.service;

import com.stylebook.event.BookingRequestedEvent;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class BookingNotificationListenerTest {

    @Test
    void shouldCreateBookingRequestNotification() {
        NotificationService notificationService = mock(NotificationService.class);
        BookingNotificationListener listener = new BookingNotificationListener(notificationService);

        UUID ownerId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();

        listener.handleBookingRequested(new BookingRequestedEvent(
                bookingId,
                ownerId,
                UUID.randomUUID(),
                UUID.randomUUID(),
                "The Loft",
                "Precision Cut",
                LocalDate.now(),
                LocalTime.of(10, 0)
        ));

        ArgumentCaptor<UUID> recipientCaptor = ArgumentCaptor.forClass(UUID.class);
        ArgumentCaptor<NotificationType> typeCaptor = ArgumentCaptor.forClass(NotificationType.class);
        ArgumentCaptor<String> titleCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Map<String, Object>> dataCaptor = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<Set<NotificationChannel>> channelsCaptor = ArgumentCaptor.forClass(Set.class);

        verify(notificationService).createNotification(
                recipientCaptor.capture(),
                typeCaptor.capture(),
                titleCaptor.capture(),
                bodyCaptor.capture(),
                dataCaptor.capture(),
                channelsCaptor.capture()
        );

        assertEquals(ownerId, recipientCaptor.getValue());
        assertEquals(NotificationType.BOOKING_REQUEST, typeCaptor.getValue());
        assertEquals("New booking request", titleCaptor.getValue());
        assertEquals("You have a new booking request from The Loft", bodyCaptor.getValue());
        assertEquals(bookingId.toString(), dataCaptor.getValue().get("bookingId"));
    }
}
