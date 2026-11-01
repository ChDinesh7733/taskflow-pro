package com.taskflow.dto.auth;

/** Returned on login and token refresh. */
public record AuthResponse(
    String       accessToken,
    String       refreshToken,
    long         accessTokenExpiresIn,   // milliseconds
    UserResponse user
) {}
