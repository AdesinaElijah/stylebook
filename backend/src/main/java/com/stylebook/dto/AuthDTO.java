package com.stylebook.dto;

import com.stylebook.entity.Shop;
import com.stylebook.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDTO {

    @Data
    public static class CustomerRegisterRequest {
        @NotBlank
        private String fullName;

        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String phone;

        @NotBlank
        @Size(min = 6)
        private String password;
    }

    @Data
    public static class OwnerRegisterRequest {
        @NotBlank
        private String fullName;

        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String phone;

        @NotBlank
        @Size(min = 6)
        private String password;

        @NotBlank
        private String shopName;

        private Shop.ShopCategory category;

        @NotBlank
        private String city;

        private String googleMapsLink;

        private Shop.SubscriptionPlan plan;
    }

    @Data
    public static class LoginRequest {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String password;
    }

    @Data
    public static class VerifyOtpRequest {
        private String email;
        private String code;
    }

    @Data
    public static class ResendOtpRequest {
        private String email;
    }

    @Data
    public static class ForgotPasswordRequest {
        @NotBlank
        @Email
        private String email;
    }

    @Data
    public static class ResetPasswordRequest {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String code;

        @NotBlank
        @Size(min = 6)
        private String newPassword;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private String role;
        private String fullName;
        private String email;
        private String userId;
        private String shopId;
        private boolean emailVerified;

        public AuthResponse(String token, User user, String shopId) {
            this.token = token;
            this.role = user.getRole().name();
            this.fullName = user.getFullName();
            this.email = user.getEmail();
            this.userId = user.getId().toString();
            this.shopId = shopId;
            this.emailVerified = user.isEmailVerified();
        }
    }

    @Data
    public static class MessageResponse {
        private String message;

        public MessageResponse(String message) {
            this.message = message;
        }
    }
}