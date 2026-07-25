package com.stylebook.event;

import com.stylebook.entity.Booking;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class BookingStatusChangedEvent {
    private final Booking booking;
}
