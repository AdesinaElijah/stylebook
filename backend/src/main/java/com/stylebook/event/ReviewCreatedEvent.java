package com.stylebook.event;

import com.stylebook.entity.Review;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class ReviewCreatedEvent {
    private final Review review;
}
