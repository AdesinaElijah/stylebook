package com.stylebook.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.UUID;

@Getter
@RequiredArgsConstructor
public class PostSharedEvent {
    private final UUID recipientUserId;
    private final UUID postId;
    private final UUID actorUserId;
}
