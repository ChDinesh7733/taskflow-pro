package com.taskflow.unit;

import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.InvalidStatusTransitionException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.*;

@DisplayName("TaskStatus transition rules")
class StatusTransitionTest {

    // ── VALID transitions ──────────────────────────────────────────────

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
        "TODO,        IN_PROGRESS",
        "TODO,        CANCELLED",
        "IN_PROGRESS, IN_REVIEW",
        "IN_PROGRESS, DONE",
        "IN_PROGRESS, TODO",
        "IN_PROGRESS, CANCELLED",
        "IN_REVIEW,   IN_PROGRESS",
        "IN_REVIEW,   DONE",
        "IN_REVIEW,   CANCELLED"
    })
    @DisplayName("Valid transition should not throw")
    void validTransitions(TaskStatus from, TaskStatus to) {
        assertThatCode(() -> from.validateTransitionTo(to))
            .doesNotThrowAnyException();
    }

    // ── INVALID transitions ────────────────────────────────────────────

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
        "TODO,      IN_REVIEW",
        "TODO,      DONE",
        "DONE,      TODO",
        "DONE,      IN_PROGRESS",
        "DONE,      CANCELLED",
        "CANCELLED, TODO",
        "CANCELLED, IN_PROGRESS",
        "CANCELLED, DONE"
    })
    @DisplayName("Invalid transition should throw InvalidStatusTransitionException")
    void invalidTransitions(TaskStatus from, TaskStatus to) {
        assertThatThrownBy(() -> from.validateTransitionTo(to))
            .isInstanceOf(InvalidStatusTransitionException.class)
            .hasMessageContaining(from.name())
            .hasMessageContaining(to.name());
    }

    @Test
    @DisplayName("DONE and CANCELLED are terminal states")
    void terminalStates() {
        assertThat(TaskStatus.DONE.isTerminal()).isTrue();
        assertThat(TaskStatus.CANCELLED.isTerminal()).isTrue();
        assertThat(TaskStatus.TODO.isTerminal()).isFalse();
        assertThat(TaskStatus.IN_PROGRESS.isTerminal()).isFalse();
        assertThat(TaskStatus.IN_REVIEW.isTerminal()).isFalse();
    }

    @Test
    @DisplayName("DONE → DONE should be rejected (self-loop on terminal)")
    void doneToDoReject() {
        assertThatThrownBy(() -> TaskStatus.DONE.validateTransitionTo(TaskStatus.DONE))
            .isInstanceOf(InvalidStatusTransitionException.class);
    }
}
