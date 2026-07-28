package com.stylebook.service;

import com.stylebook.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${stylebook.app.base-url}")
    private String baseUrl;

    @Value("${stylebook.app.name}")
    private String appName;

    @Value("${sendgrid.api.key}")
    private String sendGridApiKey;

    @Value("${sendgrid.from.address}")
    private String fromAddress;

    private static final String SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

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
        restTemplate.postForEntity(SENDGRID_API_URL, request, String.class);
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