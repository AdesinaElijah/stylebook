package com.stylebook.service;

import com.stylebook.dto.AuthDTO.*;
import com.stylebook.entity.Shop;
import com.stylebook.entity.User;
import com.stylebook.repository.ShopRepository;
import com.stylebook.repository.UserRepository;
import com.stylebook.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final SecureRandom OTP_RANDOM = new SecureRandom();
    private static final int OTP_VALID_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 30;

    /**
     * Trims and lowercases an email before it is stored.
     *
     * <p>Addresses are case-insensitive in practice, so keeping them in a single canonical
     * form stops "Ama@gmail.com" and "ama@gmail.com" becoming two accounts. Lookups still use
     * the ignore-case query, because rows created before this existed keep their original
     * casing.
     */
    private String normaliseEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    // --- OTP helpers -------------------------------------------------

    private String generateOtp() {
        int code = OTP_RANDOM.nextInt(1_000_000); // 0 - 999999
        return String.format("%06d", code);
    }

    private void issueAndSendOtp(User user) {
        String code = generateOtp();
        user.setEmailVerificationToken(code);
        user.setEmailVerificationTokenExpiry(LocalDateTime.now().plusMinutes(OTP_VALID_MINUTES));
        userRepository.save(user);
        emailService.sendOtpEmail(user, code);
    }

    // --- Registration --------------------------------------------------

    @Transactional
    public AuthResponse registerCustomer(CustomerRegisterRequest request) {
        String email = normaliseEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RuntimeException("Email already in use");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(email)
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.UserRole.CUSTOMER)
                .emailVerified(false)
                .build();

        userRepository.save(user);
        issueAndSendOtp(user);

        String token = jwtUtils.generateToken(user.getId(), user.getEmail(),
                user.getRole().name());
        return new AuthResponse(token, user, null);
    }

    @Transactional
    public AuthResponse registerOwner(OwnerRegisterRequest request) {
        String email = normaliseEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RuntimeException("Email already in use");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(email)
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.UserRole.OWNER)
                .emailVerified(false)
                .build();

        userRepository.save(user);

        Shop shop = Shop.builder()
                .owner(user)
                .name(request.getShopName())
                .category(request.getCategory() != null ?
                        request.getCategory() : Shop.ShopCategory.SALON)
                .city(request.getCity())
                .googleMapsLink(request.getGoogleMapsLink())
                .plan(request.getPlan() != null ?
                        request.getPlan() : Shop.SubscriptionPlan.FREE)
                .isActive(true)
                .avgRating(0.0)
                .reviewCount(0)
                .build();

        shopRepository.save(shop);
        issueAndSendOtp(user);

        String token = jwtUtils.generateToken(user.getId(), user.getEmail(),
                user.getRole().name());
        return new AuthResponse(token, user, shop.getId().toString());
    }

    // --- Login -----------------------------------------------------------

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normaliseEmail(request.getEmail()))
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String shopId = null;
        if (user.getRole() == User.UserRole.OWNER) {
            shopId = shopRepository.findByOwner(user)
                    .stream()
                    .findFirst()
                    .map(shop -> shop.getId().toString())
                    .orElse(null);
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail(),
                user.getRole().name());
        return new AuthResponse(token, user, shopId);
    }

    // --- Email verification ------------------------------------------

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normaliseEmail(request.getEmail()))
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("This account is already verified");
        }

        String storedCode = user.getEmailVerificationToken();
        LocalDateTime expiry = user.getEmailVerificationTokenExpiry();

        if (storedCode == null || expiry == null) {
            throw new RuntimeException("No verification code found for this account. Please request a new one.");
        }

        if (LocalDateTime.now().isAfter(expiry)) {
            throw new RuntimeException("This code has expired. Please request a new one.");
        }

        if (!storedCode.equals(request.getCode())) {
            throw new RuntimeException("Incorrect verification code");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationTokenExpiry(null);
        userRepository.save(user);

        String shopId = null;
        if (user.getRole() == User.UserRole.OWNER) {
            shopId = shopRepository.findByOwner(user)
                    .stream()
                    .findFirst()
                    .map(shop -> shop.getId().toString())
                    .orElse(null);
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail(),
                user.getRole().name());
        return new AuthResponse(token, user, shopId);
    }

    @Transactional
    public MessageResponse resendOtp(ResendOtpRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normaliseEmail(request.getEmail()))
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (user.isEmailVerified()) {
            return new MessageResponse("Your account is already verified.");
        }

        LocalDateTime expiry = user.getEmailVerificationTokenExpiry();
        if (expiry != null) {
            LocalDateTime lastSentAt = expiry.minusMinutes(OTP_VALID_MINUTES);
            long secondsSinceSent = java.time.Duration.between(lastSentAt, LocalDateTime.now()).getSeconds();
            if (secondsSinceSent < RESEND_COOLDOWN_SECONDS) {
                long wait = RESEND_COOLDOWN_SECONDS - secondsSinceSent;
                throw new RuntimeException("Please wait " + wait + "s before requesting another code");
            }
        }

        issueAndSendOtp(user);
        return new MessageResponse("A new verification code is on its way to your email.");
    }

    // --- Password reset ------------------------------------------------

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = normaliseEmail(request.getEmail());
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user == null) {
            // The response stays deliberately vague so this endpoint can't be used to discover
            // which addresses are registered. Log it, though — otherwise a typo and a genuine
            // delivery failure look identical from the outside, and neither leaves a trace.
            log.warn("Password reset requested for an address with no account: {}", email);
            return new MessageResponse("If that email is registered, you will receive password reset instructions.");
        }

        String code = generateOtp();
        user.setPasswordResetToken(code);
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusMinutes(OTP_VALID_MINUTES));
        userRepository.save(user);

        log.info("Password reset code issued for {}", user.getEmail());
        emailService.sendPasswordResetEmail(user, code);

        return new MessageResponse("If that email is registered, you will receive password reset instructions.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normaliseEmail(request.getEmail()))
                .orElseThrow(() -> new RuntimeException("Invalid or expired code"));

        String storedCode = user.getPasswordResetToken();
        LocalDateTime expiry = user.getPasswordResetTokenExpiry();

        if (storedCode == null || expiry == null) {
            throw new RuntimeException("Invalid or expired code");
        }

        if (LocalDateTime.now().isAfter(expiry)) {
            throw new RuntimeException("This code has expired. Please request a new one.");
        }

        if (!storedCode.equals(request.getCode())) {
            throw new RuntimeException("Incorrect verification code");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);

        return new MessageResponse("Your password has been reset successfully. You can now sign in.");
    }
}