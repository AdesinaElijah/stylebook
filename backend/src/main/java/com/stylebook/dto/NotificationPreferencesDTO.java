package com.stylebook.dto;

import com.stylebook.entity.NotificationPreferences;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Wire format for a user's notification settings.
 *
 * <p>Used for both reads (GET) and writes (PUT). On write, any {@code null} field means
 * "leave this one alone", which lets the app send a single changed toggle instead of the
 * whole object.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferencesDTO {

    /** Master switch for push delivery. In-app notifications are still recorded when off. */
    private Boolean pushEnabled;

    /** Booking requested / confirmed / cancelled. */
    private Boolean bookingEnabled;

    /** New chat messages. */
    private Boolean messageEnabled;

    /** New reviews left on the owner's shop. */
    private Boolean reviewEnabled;

    /** Likes, comments and shares on posts. */
    private Boolean socialEnabled;

    /** Payment received confirmations. */
    private Boolean paymentEnabled;

    public static NotificationPreferencesDTO from(NotificationPreferences prefs) {
        return NotificationPreferencesDTO.builder()
                .pushEnabled(prefs.isPushEnabled())
                .bookingEnabled(prefs.isBookingEnabled())
                .messageEnabled(prefs.isMessageEnabled())
                .reviewEnabled(prefs.isReviewEnabled())
                .socialEnabled(prefs.isSocialEnabled())
                .paymentEnabled(prefs.isPaymentEnabled())
                .build();
    }
}
