package com.stylebook.service;

import com.stylebook.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    /**
     * Timeouts matter here: these calls happen on the async pool, and a stalled connection to
     * SendGrid would otherwise hold a worker thread open indefinitely.
     */
    private final RestTemplate restTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(15))
            .build();

    @Value("${stylebook.app.base-url}")
    private String baseUrl;

    @Value("${stylebook.app.name}")
    private String appName;

    @Value("${sendgrid.api.key}")
    private String sendGridApiKey;

    @Value("${sendgrid.from.address}")
    private String fromAddress;

    private static final String SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

    /**
     * Posts one plain-text message to SendGrid.
     *
     * <p>Failures are logged and swallowed rather than rethrown. Every caller runs on the async
     * pool, so an exception here would vanish into a background thread anyway — logging it is
     * the only way anyone finds out. A 202 from SendGrid means accepted for delivery, not
     * delivered: a suppressed or bounced recipient still returns 202 and is silently dropped,
     * so a clean log line here does not by itself prove the mail arrived.
     */
    private void sendViaSendGrid(String to, String subject, String textBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(sendGridApiKey);

        Map<String, Object> payload = Map.of(
            "personalizations", List.of(Map.of("to", List.of(Map.of("email", to)))),
            "from", Map.of("email", fromAddress, "name", appName),
            "subject", subject,
            "content", List.of(Map.of("type", "text/plain", "value", textBody))
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<String> response =
                    restTemplate.postForEntity(SENDGRID_API_URL, request, String.class);
            log.info("SendGrid accepted '{}' for {} ({})", subject, to, response.getStatusCode());
        } catch (RestClientException ex) {
            log.error("SendGrid rejected '{}' for {}: {}", subject, to, ex.getMessage());
        }
    }

    @org.springframework.scheduling.annotation.Async
    public void sendOtpEmail(User user, String code) {
        String subject = "Welcome to " + appName + " — confirm your email";
        String body =
            "Hello " + user.getFullName() + ",\n\n" +
            "Thank you for joining " + appName + ", Ghana's booking platform for salons, " +
            "barbershops, spas and nail studios.\n\n" +
            "To finish setting up your account, enter this verification code in the app:\n\n" +
            "        " + code + "\n\n" +
            "The code is valid for the next 10 minutes. If you did not create a " + appName +
            " account, you can safely ignore this message and nothing will happen.\n\n" +
            "See you in the app,\n" +
            "The " + appName + " Team\n" +
            appName + " — Book your next look in seconds";

        sendViaSendGrid(user.getEmail(), subject, body);
    }

    public void sendVerificationEmail(User user) {
        String subject = appName + " - Verify Your Email";
        String body =
            "Hi " + user.getFullName() + ",\n\n" +
            "Welcome to StyleBook! Please verify your email address by clicking the link below:\n\n" +
            baseUrl + "/api/auth/verify-email?token=" + user.getEmailVerificationToken() + "\n\n" +
            "This link expires in 24 hours.\n\n" +
            "If you did not create an account, please ignore this email.\n\n" +
            "The StyleBook Team";

        sendViaSendGrid(user.getEmail(), subject, body);
    }

    /**
     * Async to match {@link #sendOtpEmail}. Previously this ran inline inside
     * {@code AuthService.forgotPassword}, which is transactional — so any SendGrid error
     * rolled back the reset code that had just been saved, leaving the user with a code in
     * their inbox that the database had never heard of.
     */
    @org.springframework.scheduling.annotation.Async
    public void sendPasswordResetEmail(User user, String code) {
        String subject = appName + " - Reset your password";
        String body =
            "Hi " + user.getFullName() + ",\n\n" +
            "We received a request to reset your " + appName + " password.\n\n" +
            "Enter this code in the app to set a new password:\n\n" +
            "        " + code + "\n\n" +
            "The code is valid for the next 10 minutes. If you did not request a password reset, " +
            "you can safely ignore this message — your password will remain unchanged.\n\n" +
            "The " + appName + " Team";

        sendViaSendGrid(user.getEmail(), subject, body);
    }

    public void sendBookingConfirmationEmail(String toEmail, String customerName,
                                              String shopName, String serviceName,
                                              String date, String time) {
        String subject = appName + " - Booking Confirmed!";
        String body =
            "Hi " + customerName + ",\n\n" +
            "Your booking has been confirmed!\n\n" +
            "Shop: " + shopName + "\n" +
            "Service: " + serviceName + "\n" +
            "Date: " + date + "\n" +
            "Time: " + time + "\n\n" +
            "We look forward to seeing you!\n\n" +
            "The StyleBook Team";

        sendViaSendGrid(toEmail, subject, body);
    }

    public void sendBookingCancellationEmail(String toEmail, String customerName,
                                              String shopName, String date, String time) {
        String subject = appName + " - Booking Cancelled";
        String body =
            "Hi " + customerName + ",\n\n" +
            "Your booking at " + shopName + " on " + date + " at " + time +
            " has been cancelled.\n\n" +
            "You can rebook anytime through the StyleBook app.\n\n" +
            "The StyleBook Team";

        sendViaSendGrid(toEmail, subject, body);
    }
}