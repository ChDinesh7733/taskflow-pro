package com.taskflow.enums;

import com.taskflow.exception.InvalidStatusTransitionException;

import java.util.Map;
import java.util.Set;

/**
 * Allowed manual transitions:
 *   TODO        → IN_PROGRESS, CANCELLED
 *   IN_PROGRESS → IN_REVIEW, DONE, TODO, CANCELLED
 *   IN_REVIEW   → IN_PROGRESS, DONE, CANCELLED
 *   DONE        → (terminal — no manual moves)
 *   CANCELLED   → (terminal — no manual moves)
 *
 * The scheduler may also move TODO → IN_PROGRESS automatically.
 */
public enum TaskStatus {
    TODO,
    IN_PROGRESS,
    IN_REVIEW,
    DONE,
    CANCELLED;

    private static final Map<TaskStatus, Set<TaskStatus>> ALLOWED = Map.of(
        TODO,        Set.of(IN_PROGRESS, CANCELLED),
        IN_PROGRESS, Set.of(IN_REVIEW, DONE, TODO, CANCELLED),
        IN_REVIEW,   Set.of(IN_PROGRESS, DONE, CANCELLED),
        DONE,        Set.of(),
        CANCELLED,   Set.of()
    );

    /** @throws InvalidStatusTransitionException when the transition is illegal */
    public void validateTransitionTo(TaskStatus next) {
        if (!ALLOWED.getOrDefault(this, Set.of()).contains(next)) {
            throw new InvalidStatusTransitionException(this, next);
        }
    }

    public boolean isTerminal() {
        return this == DONE || this == CANCELLED;
    }
}
