package com.stylebook.dto;

import com.stylebook.entity.UserDevice;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Registration payload for a device that wants push notifications.
 *
 * <p>The token is an Expo push token (<code>ExponentPushToken[...]</code>), which the app
 * obtains from expo-notifications. The entity column is named {@code fcmToken} for
 * historical reasons; Expo forwards to FCM/APNs on our behalf, so we never talk to
 * Firebase directly.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDeviceDTO {

    private UUID id;

    @NotBlank(message = "Push token is required")
    private String token;

    /** ANDROID, IOS or WEB. Defaults to ANDROID when the app doesn't say. */
    private String platform;

    public static UserDeviceDTO from(UserDevice device) {
        return UserDeviceDTO.builder()
                .id(device.getId())
                .token(device.getFcmToken())
                .platform(device.getPlatform() != null ? device.getPlatform().name() : null)
                .build();
    }
}
