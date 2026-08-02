package com.stylebook.repository;

import com.stylebook.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    /** Used to reopen an existing thread instead of creating a duplicate. */
    Optional<Conversation> findByCustomerIdAndShopId(UUID customerId, UUID shopId);

    /** A customer's inbox, newest activity first. */
    List<Conversation> findByCustomerIdOrderByLastMessageAtDesc(UUID customerId);

    /** A shop's inbox, newest activity first. */
    List<Conversation> findByShopIdOrderByLastMessageAtDesc(UUID shopId);
}
