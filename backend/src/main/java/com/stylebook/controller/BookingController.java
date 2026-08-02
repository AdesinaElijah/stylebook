package com.stylebook.controller;

import com.stylebook.dto.BookingDTO;
import com.stylebook.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<BookingDTO.BookingResponse> createBooking(
            @RequestBody BookingDTO.CreateBookingRequest request,
            Authentication authentication) {
        UUID customerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.createBooking(customerId, request));
    }

    @GetMapping("/shop/{shopId}/slots")
    public ResponseEntity<BookingDTO.SlotsResponse> getAvailableSlots(
            @PathVariable UUID shopId,
            @RequestParam String date,
            @RequestParam UUID serviceId) {
        return ResponseEntity.ok(bookingService.getAvailableSlots(
                shopId, serviceId, java.time.LocalDate.parse(date)));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<BookingDTO.BookingResponse>> getUpcomingBookings(
            Authentication authentication) {
        UUID customerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.getCustomerUpcomingBookings(customerId));
    }

    @GetMapping("/past")
    public ResponseEntity<List<BookingDTO.BookingResponse>> getPastBookings(
            Authentication authentication) {
        UUID customerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.getCustomerPastBookings(customerId));
    }

    @GetMapping("/shop/upcoming")
    public ResponseEntity<List<BookingDTO.BookingResponse>> getShopUpcomingBookings(
            Authentication authentication) {
        UUID ownerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.getShopUpcomingBookings(ownerId));
    }

    @GetMapping("/shop/all")
    public ResponseEntity<List<BookingDTO.BookingResponse>> getShopAllBookings(
            Authentication authentication) {
        UUID ownerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.getShopAllBookings(ownerId));
    }

    @PutMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingDTO.BookingResponse> confirmBooking(
            @PathVariable UUID bookingId,
            Authentication authentication) {
        UUID ownerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.confirmBooking(ownerId, bookingId));
    }

    @PutMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingDTO.BookingResponse> cancelBooking(
            @PathVariable UUID bookingId,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.cancelBooking(userId, bookingId));
    }

    /**
     * Owner records payment taken at the shop. Body is optional — an empty body means
     * "the listed price, in cash".
     */
    @PutMapping("/{bookingId}/payment")
    public ResponseEntity<BookingDTO.BookingResponse> recordPayment(
            @PathVariable UUID bookingId,
            @RequestBody(required = false) BookingDTO.RecordPaymentRequest request,
            Authentication authentication) {
        UUID ownerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.recordPayment(ownerId, bookingId, request));
    }

    @PutMapping("/{bookingId}/reschedule")
    public ResponseEntity<BookingDTO.BookingResponse> rescheduleBooking(
            @PathVariable UUID bookingId,
            @RequestBody BookingDTO.RescheduleBookingRequest request,
            Authentication authentication) {
        UUID customerId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.rescheduleBooking(customerId, bookingId, request));
    }

    @DeleteMapping("/{bookingId}")
    public ResponseEntity<Void> deleteCancelledBooking(
            @PathVariable UUID bookingId,
            Authentication authentication) {
        UUID ownerId = (UUID) authentication.getPrincipal();
        bookingService.deleteCancelledBooking(ownerId, bookingId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/shop/cancelled")
    public ResponseEntity<Void> deleteAllCancelledBookings(
            Authentication authentication) {
        UUID ownerId = (UUID) authentication.getPrincipal();
        bookingService.deleteAllCancelledBookings(ownerId);
        return ResponseEntity.ok().build();
    }
}