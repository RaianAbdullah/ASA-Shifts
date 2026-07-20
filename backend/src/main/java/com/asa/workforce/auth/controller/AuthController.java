package com.asa.workforce.auth.controller;

import com.asa.workforce.auth.dto.*;
import com.asa.workforce.auth.service.AuthService;
import com.asa.workforce.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Registration, OTP verification, and status")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new employee account")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(
            @Valid @RequestBody RegisterRequest request) {

        RegisterResponse data = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(data));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify the OTP sent after registration")
    public ResponseEntity<ApiResponse<VerifyOtpResponse>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        VerifyOtpResponse data = authService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/status/{nationalId}")
    @Operation(summary = "Check the registration status of an employee")
    public ResponseEntity<ApiResponse<StatusResponse>> getStatus(
            @PathVariable String nationalId) {

        StatusResponse data = authService.getStatus(nationalId);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }
}
