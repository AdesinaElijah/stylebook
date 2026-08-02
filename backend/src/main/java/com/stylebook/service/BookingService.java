package com.stylebook.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stylebook.dto.BookingDTO;
import com.stylebook.entity.Booking;
import com.stylebook.entity.Service;
import com.stylebook.entity.Shop;
import com.stylebook.entity.User;
import com.stylebook.event.BookingRequestedEvent;
import com.stylebook.event.BookingStatusChangedEvent;
import com.stylebook.event.PaymentReceivedEvent;
import com.stylebook.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final ApplicationEventPublisher eventPublisher;

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

        eventPublisher.publishEvent(new BookingRequestedEvent(
                booking.getId(),
                shop.getOwner().getId(),
                customer.getId(),
                shop.getId(),
                shop.getName(),
                service.getName(),
                booking.getBookingDate(),
                booking.getBookingTime()
        ));

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

        eventPublisher.publishEvent(new BookingStatusChangedEvent(
                booking.getId(),
                booking.getCustomer().getId(),
                booking.getCustomer().getId(),
                booking.getShop().getId(),
                booking.getShop().getName(),
                booking.getService().getName(),
                booking.getStatus()
        ));

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

    /**
     * Records that the customer has settled up, and sends them a receipt.
     *
     * <p>StyleBook doesn't process money — payment happens at the shop in cash, over mobile
     * money, or on a card terminal. What this does is give the shop a record of what was
     * collected and give the customer written confirmation, which is the part people
     * actually argue about later.
     *
     * <p>Only the shop owner can call this, and only once per booking: marking an
     * already-paid booking paid again would fire a second receipt for money that was never
     * collected twice.
     */
    @Transactional
    public BookingDTO.BookingResponse recordPayment(UUID ownerId,
                                                    UUID bookingId,
                                                    BookingDTO.RecordPaymentRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getShop().getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Unauthorized");
        }
        if (booking.getPaymentStatus() == Booking.PaymentStatus.PAID) {
            throw new RuntimeException("This booking is already marked as paid");
        }
        if (booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            throw new RuntimeException("Cannot record payment for a cancelled booking");
        }

        // Default to the listed price — the usual case is a standard appointment paid in full.
        BigDecimal amount = request != null && request.getAmount() != null
                ? request.getAmount()
                : booking.getService().getPrice();

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        booking.setPaymentStatus(Booking.PaymentStatus.PAID);
        booking.setPaymentMethod(parsePaymentMethod(request != null ? request.getMethod() : null));
        booking.setAmountPaid(amount);
        booking.setPaidAt(LocalDateTime.now());

        // A paid appointment is a finished one, unless it was already marked otherwise.
        if (booking.getStatus() == Booking.BookingStatus.CONFIRMED
                || booking.getStatus() == Booking.BookingStatus.PENDING) {
            booking.setStatus(Booking.BookingStatus.COMPLETED);
        }
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        // In-app notification and push. Goes to the customer — the owner already knows,
        // they just took the money.
        eventPublisher.publishEvent(new PaymentReceivedEvent(
                booking.getCustomer().getId(),
                booking.getId(),
                booking.getShop().getName(),
                booking.getService().getName(),
                amount.doubleValue()
        ));

        // And a receipt by email, which is what people actually keep.
        try {
            emailService.sendPaymentReceiptEmail(
                    booking.getCustomer().getEmail(),
                    booking.getCustomer().getFullName(),
                    booking.getShop().getName(),
                    booking.getService().getName(),
                    amount.toPlainString(),
                    formatPaymentMethod(booking.getPaymentMethod()),
                    booking.getPaidAt().toLocalDate().toString()
            );
        } catch (Exception e) {
            // Never fail a genuinely collected payment because a receipt couldn't be sent.
        }

        return BookingDTO.BookingResponse.from(booking);
    }

    /** MOBILE_MONEY -> "Mobile Money", for the receipt email. */
    private String formatPaymentMethod(Booking.PaymentMethod method) {
        if (method == null) return "Cash";
        String[] words = method.name().split("_");
        StringBuilder out = new StringBuilder();
        for (String word : words) {
            if (out.length() > 0) out.append(' ');
            out.append(word.charAt(0)).append(word.substring(1).toLowerCase());
        }
        return out.toString();
    }

    /** Falls back to cash, which is what most Ghanaian salons still take. */
    private Booking.PaymentMethod parsePaymentMethod(String method) {
        if (method == null || method.isBlank()) {
            return Booking.PaymentMethod.CASH;
        }
        try {
            return Booking.PaymentMethod.valueOf(method.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException("Unknown payment method: " + method);
        }
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

        eventPublisher.publishEvent(new BookingStatusChangedEvent(
                booking.getId(),
                booking.getCustomer().getId(),
                booking.getCustomer().getId(),
                booking.getShop().getId(),
                booking.getShop().getName(),
                booking.getService().getName(),
                booking.getStatus()
        ));

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