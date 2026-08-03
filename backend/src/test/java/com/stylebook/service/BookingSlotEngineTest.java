package com.stylebook.service;

import com.stylebook.dto.BookingDTO;
import com.stylebook.entity.Booking;
import com.stylebook.entity.Service;
import com.stylebook.entity.Shop;
import com.stylebook.repository.BookingRepository;
import com.stylebook.repository.ServiceRepository;
import com.stylebook.repository.ShopRepository;
import com.stylebook.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the booking slot engine.
 *
 * <p>This is the piece of the system most worth testing: it combines per-day opening hours,
 * variable service durations, buffers at each end of the day, and overlap against existing
 * bookings. Every one of those is an off-by-one waiting to happen, and none of it is
 * visible until a customer is shown a slot they cannot actually have.
 *
 * <p>The repositories are mocked rather than hit, so these run in milliseconds and need no
 * database. The date used throughout is a Monday well in the future, which keeps the
 * "drop times already past" rule out of the way — that branch only applies to today.
 */
@ExtendWith(MockitoExtension.class)
class BookingSlotEngineTest {

    /** Monday, 7 January 2030. Chosen so the "today" branch never fires. */
    private static final LocalDate MONDAY = LocalDate.of(2030, 1, 7);

    private static final String OPEN_9_TO_7 =
            "{\"MON\":\"09:00-19:00\",\"TUE\":\"09:00-19:00\"}";

    @Mock private BookingRepository bookingRepository;
    @Mock private UserRepository userRepository;
    @Mock private ShopRepository shopRepository;
    @Mock private ServiceRepository serviceRepository;
    @Mock private EmailService emailService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private BookingService bookingService;

    private final UUID shopId = UUID.randomUUID();
    private final UUID serviceId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(
                bookingRepository, userRepository, shopRepository,
                serviceRepository, emailService, eventPublisher);
    }

    private Shop shopOpen(String hoursJson) {
        Shop shop = Shop.builder()
                .id(shopId)
                .name("Lulu Salon")
                .openingHours(hoursJson)
                .build();
        when(shopRepository.findById(shopId)).thenReturn(Optional.of(shop));
        return shop;
    }

    private Service service(int minutes) {
        Service service = Service.builder()
                .id(serviceId)
                .name("Haircut")
                .price(BigDecimal.valueOf(50))
                .durationMinutes(minutes)
                .build();
        when(serviceRepository.findById(serviceId)).thenReturn(Optional.of(service));
        return service;
    }

    private Booking bookingAt(String time, int durationMinutes) {
        return Booking.builder()
                .bookingTime(LocalTime.parse(time))
                .service(Service.builder().durationMinutes(durationMinutes).build())
                .build();
    }

    @Test
    @DisplayName("A day missing from the opening hours is closed, with no slots")
    void closedDayHasNoSlots() {
        shopOpen("{\"TUE\":\"09:00-19:00\"}"); // no MON entry
        service(30);

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        assertThat(response.isOpen()).isFalse();
        assertThat(response.getSlots()).isEmpty();
    }

    @Test
    @DisplayName("Buffers push the first slot 30 minutes after opening and the last 30 before closing")
    void appliesBuffersAtBothEnds() {
        shopOpen(OPEN_9_TO_7);
        service(30);
        when(bookingRepository.findActiveByShopAndDate(any(), any())).thenReturn(List.of());

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        assertThat(response.isOpen()).isTrue();
        // Opens 09:00, so the first bookable start is 09:30. Closes 19:00 with a 30-minute
        // buffer, so a 30-minute service must start by 18:00 to finish by 18:30.
        assertThat(response.getSlots()).startsWith("09:30");
        assertThat(response.getSlots()).endsWith("18:00");
        assertThat(response.getSlots()).doesNotContain("09:00", "18:30", "19:00");
    }

    @Test
    @DisplayName("Slots are generated at 30-minute intervals")
    void generatesHalfHourIntervals() {
        shopOpen(OPEN_9_TO_7);
        service(30);
        when(bookingRepository.findActiveByShopAndDate(any(), any())).thenReturn(List.of());

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        assertThat(response.getSlots()).containsSequence("09:30", "10:00", "10:30", "11:00");
    }

    @Test
    @DisplayName("An existing booking hides every slot that would overlap it")
    void existingBookingBlocksOverlappingSlots() {
        shopOpen(OPEN_9_TO_7);
        service(30);
        // Booked 11:00 for 90 minutes, so the shop is busy 11:00–12:30.
        when(bookingRepository.findActiveByShopAndDate(any(), any()))
                .thenReturn(List.of(bookingAt("11:00", 90)));

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        // Overlap is start < existingEnd AND existingStart < end. A 30-minute service at
        // 10:30 finishes exactly as the booking starts, so it survives; 12:30 begins
        // exactly as the booking ends, so it survives too. The three between do not.
        assertThat(response.getSlots()).doesNotContain("11:00", "11:30", "12:00");
        assertThat(response.getSlots()).contains("10:30", "12:30");
    }

    @Test
    @DisplayName("A service too long for the day yields no slots at all")
    void serviceLongerThanWindowHasNoSlots() {
        shopOpen(OPEN_9_TO_7);          // bookable window is 09:30–18:30, nine hours
        service(10 * 60);               // ten hours
        when(bookingRepository.findActiveByShopAndDate(any(), any())).thenReturn(List.of());

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        assertThat(response.isOpen()).isTrue();
        assertThat(response.getSlots()).isEmpty();
    }

    @Test
    @DisplayName("A longer service leaves less room at the end of the day")
    void longerServiceEndsEarlier() {
        shopOpen(OPEN_9_TO_7);
        service(120);
        when(bookingRepository.findActiveByShopAndDate(any(), any())).thenReturn(List.of());

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        // Must finish by 18:30, so a two-hour service cannot start after 16:30.
        assertThat(response.getSlots()).endsWith("16:30");
    }

    @Test
    @DisplayName("Malformed opening hours are treated as closed rather than crashing")
    void malformedHoursAreTreatedAsClosed() {
        shopOpen("{\"MON\":\"not-a-time-range\"}");
        service(30);

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        assertThat(response.isOpen()).isFalse();
        assertThat(response.getSlots()).isEmpty();
    }

    @Test
    @DisplayName("A shop with no opening hours set is closed, not open all day")
    void missingOpeningHoursIsClosed() {
        shopOpen(null);
        service(30);

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        assertThat(response.isOpen()).isFalse();
        assertThat(response.getSlots()).isEmpty();
    }

    @Test
    @DisplayName("A closing time at or before opening is treated as closed")
    void invertedHoursAreTreatedAsClosed() {
        shopOpen("{\"MON\":\"19:00-09:00\"}");
        service(30);

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        assertThat(response.isOpen()).isFalse();
        assertThat(response.getSlots()).isEmpty();
    }

    @Test
    @DisplayName("An explicit CLOSED marker closes the day")
    void explicitClosedMarker() {
        shopOpen("{\"MON\":\"CLOSED\",\"TUE\":\"09:00-19:00\"}");
        service(30);

        BookingDTO.SlotsResponse response =
                bookingService.getAvailableSlots(shopId, serviceId, MONDAY);

        assertThat(response.isOpen()).isFalse();
        assertThat(response.getSlots()).isEmpty();
    }
}
