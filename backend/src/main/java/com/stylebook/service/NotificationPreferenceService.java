package com.stylebook.service;

import com.stylebook.entity.NotificationPreference;
import com.stylebook.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository notificationPreferenceRepository;

    public NotificationPreference getOrCreate(UUID userId) {
        return notificationPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> notificationPreferenceRepository.save(NotificationPreference.builder().userId(userId).build()));
    }

    @Transactional
    public NotificationPreference updatePreferences(UUID userId, Map<String, Object> updates) {
        NotificationPreference preference = getOrCreate(userId);
        if (updates.containsKey("inAppEnabled")) {
            preference.setInAppEnabled(Boolean.parseBoolean(updates.get("inAppEnabled").toString()));
        }
        if (updates.containsKey("pushEnabled")) {
            preference.setPushEnabled(Boolean.parseBoolean(updates.get("pushEnabled").toString()));
        }
        if (updates.containsKey("smsEnabled")) {
            preference.setSmsEnabled(Boolean.parseBoolean(updates.get("smsEnabled").toString()));
        }
        if (updates.containsKey("smsTransactionalOnly")) {
            preference.setSmsTransactionalOnly(Boolean.parseBoolean(updates.get("smsTransactionalOnly").toString()));
        }
        if (updates.containsKey("bookingUpdatesEnabled")) {
            preference.setBookingUpdatesEnabled(Boolean.parseBoolean(updates.get("bookingUpdatesEnabled").toString()));
        }
        if (updates.containsKey("messageUpdatesEnabled")) {
            preference.setMessageUpdatesEnabled(Boolean.parseBoolean(updates.get("messageUpdatesEnabled").toString()));
        }
        if (updates.containsKey("reviewUpdatesEnabled")) {
            preference.setReviewUpdatesEnabled(Boolean.parseBoolean(updates.get("reviewUpdatesEnabled").toString()));
        }
        if (updates.containsKey("postUpdatesEnabled")) {
            preference.setPostUpdatesEnabled(Boolean.parseBoolean(updates.get("postUpdatesEnabled").toString()));
        }
        return notificationPreferenceRepository.save(preference);
    }
}
