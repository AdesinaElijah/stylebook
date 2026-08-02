package com.stylebook.repository;

import com.stylebook.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    /**
     * Case-insensitive lookup — the one every auth flow should use.
     *
     * <p>People do not type their email the same way twice. Someone who signed up as
     * "Ama.Mensah@gmail.com" will happily type "ama.mensah@gmail.com" on the forgot-password
     * screen, and an exact-match query silently finds nothing. Older rows were stored with
     * whatever casing the user typed, so matching has to ignore case rather than relying on
     * everything being normalised.
     */
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    /** Prevents two accounts that differ only by capitalisation. */
    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByEmailVerificationToken(String token);
}