package com.taskflow.exception;

import com.taskflow.enums.TaskStatus;

public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(TaskStatus from, TaskStatus to) {
        super("Cannot transition task from %s to %s".formatted(from, to));
    }
}
