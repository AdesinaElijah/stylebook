package com.stylebook.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Turns exceptions into JSON responses.
 *
 * <p>These handlers also log, which is not optional housekeeping: once an
 * {@code @ExceptionHandler} claims an exception, Spring treats it as dealt with and prints
 * nothing itself. Without the log calls below, every failure this class catches disappears
 * silently — the client sees an error message while the server logs stay clean, which makes
 * production problems effectively undebuggable.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Business-rule failures. These are thrown deliberately by services ("Shop not found",
     * "This time slot is already booked"), so they're expected traffic rather than defects —
     * logged at WARN without a stack trace.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex,
                                                                      HttpServletRequest request) {
        log.warn("{} {} -> {}", request.getMethod(), request.getRequestURI(), ex.getMessage());

        Map<String, String> error = new HashMap<>();
        error.put("error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(fieldName, message);
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    /**
     * Anything unplanned. Logged at ERROR with the full stack trace, because by definition
     * nobody anticipated it and the trace is the only way to find out what happened.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGenericException(Exception ex,
                                                                      HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);

        Map<String, String> error = new HashMap<>();
        error.put("error", "An unexpected error occurred");
        error.put("details", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
