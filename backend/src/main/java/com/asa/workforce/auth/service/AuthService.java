package com.asa.workforce.auth.service;

import com.asa.workforce.auth.dto.*;
import com.asa.workforce.entity.Department;
import com.asa.workforce.entity.Employee;
import com.asa.workforce.entity.Employee.Status;
import com.asa.workforce.repository.DepartmentRepository;
import com.asa.workforce.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS   = 5;

    private final EmployeeRepository   employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SecureRandom          secureRandom = new SecureRandom();

    // ── Register ────────────────────────────────────────────

    @Transactional
    public RegisterResponse register(RegisterRequest req) {
        // Duplicate checks
        if (employeeRepository.existsByNationalId(req.getNationalId())) {
            throw new IllegalArgumentException("National ID already registered");
        }
        if (employeeRepository.existsByPhoneNumber(req.getPhoneNumber())) {
            throw new IllegalArgumentException("Phone number already registered");
        }

        // Resolve optional department
        Department dept = null;
        if (req.getDepartmentId() != null && !req.getDepartmentId().isBlank()) {
            dept = departmentRepository.findById(UUID.fromString(req.getDepartmentId()))
                    .orElse(null);
        }

        // Generate OTP
        String otp = generateOtp();
        OffsetDateTime otpExpiry = OffsetDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);

        // Build and persist employee
        Employee employee = Employee.builder()
                .nationalId(req.getNationalId())
                .firstNameAr(req.getFirstNameAr())
                .lastNameAr(req.getLastNameAr())
                .phoneNumber(req.getPhoneNumber())
                .department(dept)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .status(Status.PENDING_VERIFICATION)
                .otpCode(otp)
                .otpExpiresAt(otpExpiry)
                .build();

        employee = employeeRepository.save(employee);

        // In development: log OTP to console.
        // In production: replace with SMS provider (Stage 5+).
        log.info("[DEV OTP] National ID={} OTP={} (expires {})",
                req.getNationalId(), otp, otpExpiry);

        return RegisterResponse.builder()
                .employeeId(employee.getId().toString())
                .nationalId(maskNationalId(req.getNationalId()))
                .status(employee.getStatus().name())
                .message("Registration submitted. Please verify with the OTP sent to your phone.")
                .maskedPhone(maskPhone(req.getPhoneNumber()))
                .otpHint("[DEV] OTP logged to server console")
                .build();
    }

    // ── Verify OTP ──────────────────────────────────────────

    @Transactional
    public VerifyOtpResponse verifyOtp(VerifyOtpRequest req) {
        Employee employee = employeeRepository.findByNationalId(req.getNationalId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (employee.getStatus() != Status.PENDING_VERIFICATION) {
            throw new IllegalStateException("Account is not awaiting OTP verification");
        }

        // Rate-limit attempts
        if (employee.getOtpAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new IllegalStateException("Too many OTP attempts. Please contact HR.");
        }

        // Check expiry
        if (employee.getOtpExpiresAt() == null ||
                OffsetDateTime.now().isAfter(employee.getOtpExpiresAt())) {
            throw new IllegalStateException("OTP has expired. Please request a new one.");
        }

        // Validate
        if (!req.getOtpCode().equals(employee.getOtpCode())) {
            employee.setOtpAttempts((short) (employee.getOtpAttempts() + 1));
            employeeRepository.save(employee);
            throw new IllegalArgumentException("Invalid OTP code");
        }

        // Clear OTP and advance status
        employee.setOtpCode(null);
        employee.setOtpExpiresAt(null);
        employee.setOtpAttempts((short) 0);
        employee.setStatus(Status.PENDING_APPROVAL);
        employeeRepository.save(employee);

        log.info("[AUTH] Employee {} OTP verified → PENDING_APPROVAL", req.getNationalId());

        return VerifyOtpResponse.builder()
                .status(Status.PENDING_APPROVAL.name())
                .message("OTP verified. Your account is pending admin approval.")
                .build();
    }

    // ── Status check ────────────────────────────────────────

    @Transactional(readOnly = true)
    public StatusResponse getStatus(String nationalId) {
        Employee employee = employeeRepository.findByNationalId(nationalId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        String message = switch (employee.getStatus()) {
            case PENDING_VERIFICATION -> "OTP verification pending.";
            case PENDING_APPROVAL     -> "Account awaiting admin approval.";
            case ACTIVE               -> "Account is active.";
            case SUSPENDED            -> "Account is suspended. Contact HR.";
            case REJECTED             -> "Registration was rejected. Contact HR.";
        };

        return StatusResponse.builder()
                .nationalId(maskNationalId(nationalId))
                .status(employee.getStatus().name())
                .message(message)
                .build();
    }

    // ── Helpers ─────────────────────────────────────────────

    private String generateOtp() {
        int code = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(code);
    }

    private String maskNationalId(String id) {
        return "******" + id.substring(6);
    }

    private String maskPhone(String phone) {
        if (phone.length() < 4) return "****";
        return "*".repeat(phone.length() - 4) + phone.substring(phone.length() - 4);
    }
}
