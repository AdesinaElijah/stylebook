package com.stylebook.service;

import com.stylebook.dto.NotificationPreferencesDTO;
import com.stylebook.entity.NotificationPreferences;
import com.stylebook.entity.NotificationType;
import com.stylebook.repository.NotificationPreferencesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Owns a user's notification settings and answers the question the notification
 * pipeline actually cares about: "is this user willing to receive this?"
 *
 * <p>Rows are created lazily. A user who has never opened settings has no row, and
 * {@link #getOrCreate} materialises one with everything switched on, which matches the
 * defaults declared on the entity.
 */
@Service
@RequiredArgsConstructor
public class NotificationPreferencesService {

    private final NotificationPreferencesRepository preferencesRepository;

    /** Returns the user's settings, creating the all-enabled default row on first access. */
    @Transactional
    public NotificationPreferences getOrCreate(UUID userId) {
        return preferencesRepository.findByUserId(userId)
                .orElseGet(() -> preferencesRepository.save(
                        NotificationPreferences.builder()
                                .userId(userId)
                                .build()));
    }

    /**
     * Applies a partial update. Null fields on the DTO are ignored, so the app can send
     * just the toggle the user flipped.
     */
    @Transactional
    public NotificationPreferences update(UUID userId, NotificationPreferencesDTO changes) {
        NotificationPreferences prefs = getOrCreate(userId);

        if (changes.getPushEnabled() != null) prefs.setPushEnabled(changes.getPushEnabled());
        if (changes.getBookingEnabled() != null) prefs.setBookingEnabled(changes.getBookingEnabled());
        if (changes.getMessageEnabled() != null) prefs.setMessageEnabled(changes.getMessageEnabled());
        if (changes.getReviewEnabled() != null) prefs.setReviewEnabled(changes.getReviewEnabled());
        if (changes.getSocialEnabled() != null) prefs.setSocialEnabled(changes.getSocialEnabled());
        if (changes.getPaymentEnabled() != null) prefs.setPaymentEnabled(changes.getPaymentEnabled());

        return preferencesRepository.save(prefs);
    }

    /**
     * Whether a notification of this type should be recorded at all.
     *
     * <p>This gates the per-category switches only. The master push switch is separate
     * (see {@link #allowsPush}) because muting push should not also hide the notification
     * from the in-app bell.
     */
    @Transactional
    public boolean allowsType(UUID userId, NotificationType type) {
        NotificationPreferences prefs = getOrCreate(userId);

        return switch (type) {
            case BOOKING_REQUEST, BOOKING_CONFIRMED, BOOKING_CANCELLED -> prefs.isBookingEnabled();
            case NEW_MESSAGE -> prefs.isMessageEnabled();
            case PAYMENT_RECEIVED -> prefs.isPaymentEnabled();
            case NEW_REVIEW -> prefs.isReviewEnabled();
            case POST_LIKE, POST_COMMENT, POST_SHARE -> prefs.isSocialEnabled();
        };
    }

    /** Master switch for push delivery, independent of category. */
    @Transactional
    public boolean allowsPush(UUID userId) {
        return getOrCreate(userId).isPushEnabled();
    }
}
