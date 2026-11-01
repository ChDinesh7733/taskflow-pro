package com.taskflow.service;

import com.taskflow.dto.auth.*;

public interface AuthService {
    UserResponse  register(RegisterRequest request);
    AuthResponse  login(LoginRequest request);
    AuthResponse  refresh(String rawRefreshToken);
    UserResponse  me(String email);
    UserResponse  updateProfile(String email, UpdateProfileRequest request);
    void          changePassword(String email, ChangePasswordRequest request);
    void          logout(String email);
}
