package com.stylebook.service;

import com.stylebook.entity.UserDevice;
import com.stylebook.repository.UserDeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Tracks which physical devices a user is signed in on, so push notifications can be
 * addressed to all of them.
 *
 * <p>Push tokens are not stable: they rotate, and the same handset can be handed to a
 * different account. Registration therefore claims an existing token row for the current
 * user rather than blindly inserting, which stops one person's notifications arriving on
 * someone else's phone.
 */
@Service
@RequiredArgsConstructor
public class UserDeviceService {

    private final UserDeviceRepository userDeviceRepository;

    /** Registers (or re-claims) a push token for this user. Safe to call on every login. */
    @Transactional
    public UserDevice register(UUID userId, String token, String platform) {
        UserDevice device = userDeviceRepository.findByFcmTokenAndActiveTrue(token)
                .orElseGet(() -> UserDevice.builder()
                        .fcmToken(token)
                        .build());

        // Re-point the token at whoever is signed in now.
        device.setUserId(userId);
        device.setActive(true);
        device.setPlatform(parsePlatform(platform));

        return userDeviceRepository.save(device);
    }

    /**
     * Deactivates a token, called on sign-out. Kept as a soft delete so the row's history
     * survives and a re-login can simply flip it back on.
     */
    @Transactional
    public void unregister(String token) {
        userDeviceRepository.findByFcmTokenAndActiveTrue(token)
                .ifPresent(device -> {
                    device.setActive(false);
                    userDeviceRepository.save(device);
                });
    }

    /** Every device currently signed in as this user. */
    public List<UserDevice> activeDevicesFor(UUID userId) {
        return userDeviceRepository.findByUserIdAndActiveTrue(userId);
    }

    private UserDevice.Platform parsePlatform(String platform) {
        if (platform == null || platform.isBlank()) {
            return UserDevice.Platform.ANDROID;
        }
        try {
            return UserDevice.Platform.valueOf(platform.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return UserDevice.Platform.ANDROID;
        }
    }
}
