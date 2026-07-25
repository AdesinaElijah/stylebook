package com.stylebook.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stylebook.dto.BookingDTO;
import com.stylebook.entity.Booking;
import com.stylebook.entity.Service;
import com.stylebook.entity.Shop;
import com.stylebook.entity.User;
import com.stylebook.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ServiceRepository serviceRepository;
    private final EmailService emailService;

    @Transactional
    public BookingDTO.BookingResponse createBooking(UUID customerId,
                                                     BookingDTO.CreateBookingRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shop shop = shopRepository.findById(UUID.fromString(request.getShopId()))
                .orElseThrow(() -> new RuntimeException("Shop not found"));

        Service service = serviceRepository.findById(UUID.fromString(request.getServiceId()))
                .orElseThrow(() -> new RuntimeException("Service not found"));

        assertSlotAvailable(shop, service, request.getBookingDate(),
                request.getBookingTime(), null);

        Booking booking = Booking.builder()
                .customer(customer)
                .shop(shop)
                .service(service)
                .bookingDate(request.getBookingDate())
                .bookingTime(request.getBookingTime())
                .status(Booking.BookingStatus.PENDING)
                .autoConfirmAt(LocalDateTime.now().plusSeconds(45))
                .build();

        bookingRepository.save(booking);
        booking = bookingRepository.findById(booking.getId()).orElse(booking);
        return BookingDTO.BookingResponse.from(booking);
    }

    public List<BookingDTO.BookingResponse> getCustomerUpcomingBookings(UUID customerId) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return bookingRepository.findUpcomingByCustomer(customer, LocalDate.now())
                .stream()
                .map(BookingDTO.BookingResponse::from)
                .collect(Collectors.toList());
    }

    public List<BookingDTO.BookingResponse> getCustomerPastBookings(UUID customerId) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return bookingRepository.findPastByCustomer(customer)
                .stream()
                .map(BookingDTO.BookingResponse::from)
                .collect(Collectors.toList());
    }

    public List<BookingDTO.BookingResponse> getShopUpcomingBookings(UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Shop shop = shopRepository.findByOwnerAndIsActiveTrue(owner)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        return bookingRepository.findUpcomingByShop(shop, LocalDate.now())
                .stream()
                .map(BookingDTO.BookingResponse::from)
                .collect(Collectors.toList());
    }

    public List<BookingDTO.BookingResponse> getShopAllBookings(UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Shop shop = shopRepository.findByOwnerAndIsActiveTrue(owner)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        return bookingRepository.findByShopOrderByBookingDateAscBookingTimeAsc(shop)
                .stream()
                .map(BookingDTO.BookingResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public BookingDTO.BookingResponse confirmBooking(UUID ownerId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getShop().getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Unauthorized");
        }

        booking.setStatus(Booking.BookingStatus.CONFIRMED);
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        try {
            emailService.sendBookingConfirmationEmail(
                    booking.getCustomer().getEmail(),
                    booking.getCustomer().getFullName(),
                    booking.getShop().getName(),
                    booking.getService().getName(),
                    booking.getBookingDate().toString(),
                    booking.getBookingTime().toString()
            );
        } catch (Exception e) {
            // Log but don't fail
        }

        return BookingDTO.BookingResponse.from(booking);
    }

    @Transactional
    public BookingDTO.BookingResponse cancelBooking(UUID userId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isCustomer = booking.getCustomer().getId().equals(userId);
        boolean isOwner = booking.getShop().getOwner().getId().equals(userId);

        if (!isCustomer && !isOwner) {
            throw new RuntimeException("Unauthorized");
        }

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        try {
            emailService.sendBookingCancellationEmail(
                    booking.getCustomer().getEmail(),
                    booking.getCustomer().getFullName(),
                    booking.getShop().getName(),
                    booking.getBookingDate().toString(),
                    booking.getBookingTime().toString()
            );
        } catch (Exception e) {
            // Log but don't fail
        }

        return BookingDTO.BookingResponse.from(booking);
    }

    @Transactional
    public BookingDTO.BookingResponse rescheduleBooking(UUID customerId, UUID bookingId,
                                                         BookingDTO.RescheduleBookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getCustomer().getId().equals(customerId)) {
            throw new RuntimeException("Unauthorized");
        }

        assertSlotAvailable(booking.getShop(), booking.getService(),
                request.getBookingDate(), request.getBookingTime(), booking.getId());

        booking.setBookingDate(request.getBookingDate());
        booking.setBookingTime(request.getBookingTime());
        booking.setStatus(Booking.BookingStatus.PENDING);
        booking.setAutoConfirmAt(LocalDateTime.now().plusSeconds(45));
        booking.setRescheduled(true);
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        return BookingDTO.BookingResponse.from(booking);
    }

    @Transactional
    public void deleteCancelledBooking(UUID ownerId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getShop().getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (booking.getStatus() != Booking.BookingStatus.CANCELLED) {
            throw new RuntimeException("Only cancelled bookings can be deleted");
        }

        bookingRepository.delete(booking);
    }

    @Transactional
    public void deleteAllCancelledBookings(UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Shop shop = shopRepository.findByOwnerAndIsActiveTrue(owner)
                .orElseThrow(() -> new RuntimeException("Shop not found"));

        List<Booking> allBookings = bookingRepository
                .findByShopOrderByBookingDateAscBookingTimeAsc(shop);

        List<Booking> cancelled = allBookings.stream()
                .filter(b -> b.getStatus() == Booking.BookingStatus.CANCELLED)
                .collect(Collectors.toList());

        bookingRepository.deleteAll(cancelled);
    }

    @Scheduled(fixedRate = 10000)
    @Transactional
    public void autoConfirmBookings() {
        List<Booking> bookingsToConfirm = bookingRepository
                .findBookingsToAutoConfirm(LocalDateTime.now());

        for (Booking booking : bookingsToConfirm) {
            booking.setStatus(Booking.BookingStatus.CONFIRMED);
            booking.setUpdatedAt(LocalDateTime.now());
            bookingRepository.save(booking);
        }
    }

    // Mark confirmed bookings as COMPLETED once their end time has passed
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void completeFinishedBookings() {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> candidates = bookingRepository.findConfirmedUpToDate(LocalDate.now());

        for (Booking booking : candidates) {
            int duration = booking.getService().getDurationMinutes() != null
                    ? booking.getService().getDurationMinutes() : 30;
            LocalDateTime end = LocalDateTime.of(booking.getBookingDate(), booking.getBookingTime())
                    .plusMinutes(duration);
            if (end.isBefore(now)) {
                booking.setStatus(Booking.BookingStatus.COMPLETED);
                booking.setUpdatedAt(now);
                bookingRepository.save(booking);
            }
        }
    }

    public BookingDTO.SlotsResponse getAvailableSlots(UUID shopId, UUID serviceId, LocalDate date) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        BookingDTO.SlotsResponse response = new BookingDTO.SlotsResponse();
        response.setSlots(new ArrayList<>());

        int[] window = getOpeningWindow(shop, date);
        if (window == null) {
            response.setOpen(false);
            return response;
        }
        response.setOpen(true);

        // 30-minute buffer: first slot starts 30 min after opening,
        // last appointment must finish 30 min before closing
        int openMin = window[0] + 30;
        int closeMin = window[1] - 30;
        int duration = service.getDurationMinutes() != null ? service.getDurationMinutes() : 30;

        List<int[]> booked = bookingRepository.findActiveByShopAndDate(shop, date).stream()
                .map(b -> {
                    int start = b.getBookingTime().toSecondOfDay() / 60;
                    int d = b.getService().getDurationMinutes() != null
                            ? b.getService().getDurationMinutes() : 30;
                    return new int[]{start, start + d};
                })
                .collect(Collectors.toList());

        boolean isToday = date.equals(LocalDate.now());
        int nowMin = LocalTime.now().toSecondOfDay() / 60;

        for (int t = openMin; t + duration <= closeMin; t += 30) {
            if (isToday && t <= nowMin) continue;
            boolean overlaps = false;
            for (int[] interval : booked) {
                if (t < interval[1] && interval[0] < t + duration) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) {
                response.getSlots().add(String.format("%02d:%02d", t / 60, t % 60));
            }
        }
        return response;
    }

    private void assertSlotAvailable(Shop shop, Service service, LocalDate date,
                                     LocalTime time, UUID excludeBookingId) {
        int[] window = getOpeningWindow(shop, date);
        if (window == null) {
            throw new RuntimeException("The shop is closed on this day");
        }
        int duration = service.getDurationMinutes() != null ? service.getDurationMinutes() : 30;
        int start = time.toSecondOfDay() / 60;
        int end = start + duration;

        if (start < window[0] + 30 || end > window[1] - 30) {
            throw new RuntimeException("This time is outside the shop's bookable hours");
        }

        for (Booking b : bookingRepository.findActiveByShopAndDate(shop, date)) {
            if (excludeBookingId != null && b.getId().equals(excludeBookingId)) continue;
            int bStart = b.getBookingTime().toSecondOfDay() / 60;
            int bDuration = b.getService().getDurationMinutes() != null
                    ? b.getService().getDurationMinutes() : 30;
            int bEnd = bStart + bDuration;
            if (start < bEnd && bStart < end) {
                throw new RuntimeException("This time slot is already booked");
            }
        }
    }

    // Returns {openMinutes, closeMinutes} for the date, or null if closed / not set
    private int[] getOpeningWindow(Shop shop, LocalDate date) {
        if (shop.getOpeningHours() == null || shop.getOpeningHours().isEmpty()) {
            return null;
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> hours = new ObjectMapper()
                    .readValue(shop.getOpeningHours(), Map.class);
            String dayKey = date.getDayOfWeek().name().substring(0, 3);
            String range = hours.get(dayKey);
            if (range == null || range.trim().isEmpty()
                    || range.trim().equalsIgnoreCase("CLOSED")) {
                return null;
            }
            String[] parts = range.trim().split("-");
            String[] open = parts[0].trim().split(":");
            String[] close = parts[1].trim().split(":");
            int openMin = Integer.parseInt(open[0]) * 60 + Integer.parseInt(open[1]);
            int closeMin = Integer.parseInt(close[0]) * 60 + Integer.parseInt(close[1]);
            if (closeMin <= openMin) return null;
            return new int[]{openMin, closeMin};
        } catch (Exception e) {
            return null;
        }
    }
}