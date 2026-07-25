package com.stylebook.repository;

import com.stylebook.entity.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserDeviceRepository extends JpaRepository<UserDevice, UUID> {
    List<UserDevice> findByUserIdAndActiveTrue(UUID userId);
    Optional<UserDevice> findByFcmTokenAndActiveTrue(String fcmToken);
}
