package com.taskmanagement.exception;

/** Thrown when registration is attempted with an e-mail that already exists. */
public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException(String email) {
        super("An account with this email already exists");
    }
}
