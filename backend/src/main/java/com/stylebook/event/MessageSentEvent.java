package com.stylebook.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.UUID;

@Getter
@RequiredArgsConstructor
public class MessageSentEvent {
    private final UUID recipientUserId;
    private final UUID senderUserId;
    private final String content;
}
