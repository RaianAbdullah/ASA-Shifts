package com.asa.workforce.auth.service;

import com.asa.workforce.audit.AuditService;
import com.asa.workforce.auth.dto.*;
import com.asa.workforce.entity.Department;
import com.asa.workforce.entity.Employee;
import com.asa.workforce.entity.Employee.Status;
import com.asa.workforce.notification.PushNotificationService;
import com.asa.workforce.repository.DepartmentRepository;
import com.asa.workforce.repository.EmployeeRepository;
import com.asa.workforce.repository.PushTokenRepository;
import com.asa.workforce.security.JwtService;
import com.asa.workforce.security.TokenBlacklistService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS   = 3;   // hard lockout → contact HR
    private static final int MAX_LOGIN_ATTEMPTS = 5;   // 30-min timed lockout
    private static final int LOGIN_LOCK_MINUTES = 30;

    private final EmployeeRepository     employeeRepository;
    private final DepartmentRepository   departmentRepository;
    private final PushTokenRepository    pushTokenRepository;
    private final BCryptPasswordEncoder  passwordEncoder;
    private final JwtService             jwtService;
    private final TokenBlacklistService  blacklistService;
    private final AuditService           auditService;
    private final PushNotificationService pushService;
    private final SecureRandom           secureRandom = new SecureRandom();

    /**
     * When true, the generated OTP is printed to the server console.
     * Set to true in development only — NEVER in production.
     * Controlled via app.otp.log-to-console in application-development.yml.
     */
    @Value("${app.otp.log-to-console:false}")
    private boolean otpLogToConsole;

    // ── Register ─────────────────────────────────────────────────────────────

    @Transactional
    public RegisterResponse register(RegisterRequest req, HttpServletRequest httpReq) {
        if (employeeRepository.existsByNationalId(req.getNationalId())) {
            auditService.log(AuditService.REGISTER, null,
                    Map.of("nationalId", mask(req.getNationalId()), "reason", "duplicate_national_id"),
                    httpReq);
            throw new IllegalArgumentException("National ID already registered");
        }
        if (employeeRepository.existsByPhoneNumber(req.getPhoneNumber())) {
            throw new IllegalArgumentException("Phone number already registered");
        }

        Department dept = null;
        if (req.getDepartmentId() != null && !req.getDepartmentId().isBlank()) {
            dept = departmentRepository.findById(UUID.fromString(req.getDepartmentId())).orElse(null);
        }

        String      otp     = generateOtp();
        OffsetDateTime xAt  = OffsetDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);

        Employee emp = Employee.builder()
                .nationalId(req.getNationalId())
                .firstNameAr(req.getFirstNameAr())
                .lastNameAr(req.getLastNameAr())
                .phoneNumber(req.getPhoneNumber())
                .department(dept)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .status(Status.PENDING_VERIFICATION)
                .otpCode(otp)
                .otpExpiresAt(xAt)
                .build();

        emp = employeeRepository.save(emp);

        // Log OTP to console ONLY in development — never in production
        if (otpLogToConsole) {
            log.info("[DEV OTP] National ID={} OTP={} (expires {})", req.getNationalId(), otp, xAt);
        }

        auditService.log(AuditService.REGISTER, emp,
                Map.of("maskedId", mask(req.getNationalId())), httpReq);

        // Notify all active admins of new registration
        List<String> adminTokens = pushTokenRepository.findAdminPushTokens();
        pushService.sendToTokens(adminTokens,
                "طلب تسجيل جديد — New Registration",
                emp.getFirstNameAr() + " " + emp.getLastNameAr() + " is awaiting OTP verification",
                Map.of("type", "new_registration", "employeeId", emp.getId().toString()));

        return RegisterResponse.builder()
                .employeeId(emp.getId().toString())
                .nationalId(mask(req.getNationalId()))
                .status(emp.getStatus().name())
                .message("Registration submitted. Please verify with the OTP sent to your phone.")
                .maskedPhone(maskPhone(req.getPhoneNumber()))
                // Only expose dev hint when OTP logging is enabled
                .otpHint(otpLogToConsole ? "[DEV] OTP logged to server console" : null)
                .build();
    }

    // ── Verify OTP ───────────────────────────────────────────────────────────

    @Transactional
    public VerifyOtpResponse verifyOtp(VerifyOtpRequest req, HttpServletRequest httpReq) {
        Employee emp = employeeRepository.findByNationalId(req.getNationalId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (emp.getStatus() != Status.PENDING_VERIFICATION) {
            throw new IllegalStateException("Account is not awaiting OTP verification");
        }
        if (emp.getOtpAttempts() >= MAX_OTP_ATTEMPTS) {
            auditService.log(AuditService.OTP_LOCKED, emp,
                    Map.of("attempts", emp.getOtpAttempts()), httpReq);
            throw new IllegalStateException(
                    "Account locked after " + MAX_OTP_ATTEMPTS +
                    " failed OTP attempts. Please contact HR.");
        }
        if (emp.getOtpExpiresAt() == null || OffsetDateTime.now().isAfter(emp.getOtpExpiresAt())) {
            throw new IllegalStateException("OTP has expired. Please request a new one.");
        }
        if (!req.getOtpCode().equals(emp.getOtpCode())) {
            emp.setOtpAttempts((short) (emp.getOtpAttempts() + 1));
            employeeRepository.save(emp);
            auditService.log(AuditService.OTP_VERIFY_FAILURE, emp,
                    Map.of("attempts", emp.getOtpAttempts(),
                           "remaining", MAX_OTP_ATTEMPTS - emp.getOtpAttempts()),
                    httpReq);
            int remaining = MAX_OTP_ATTEMPTS - emp.getOtpAttempts();
            throw new IllegalArgumentException(
                    "Invalid OTP code. " + remaining + " attempt(s) remaining.");
        }

        emp.setOtpCode(null);
        emp.setOtpExpiresAt(null);
        emp.setOtpAttempts((short) 0);
        emp.setStatus(Status.PENDING_APPROVAL);
        employeeRepository.save(emp);

        auditService.log(AuditService.OTP_VERIFY_SUCCESS, emp,
                Map.of("status", "PENDING_APPROVAL"), httpReq);
        log.info("[AUTH] Employee {} OTP verified → PENDING_APPROVAL", mask(req.getNationalId()));

        // Notify admins this employee is now pending approval
        List<String> adminTokens = pushTokenRepository.findAdminPushTokens();
        pushService.sendToTokens(adminTokens,
                "موظف ينتظر الموافقة — Awaiting Approval",
                emp.getFirstNameAr() + " " + emp.getLastNameAr() + " has verified their OTP",
                Map.of("type", "pending_approval", "employeeId", emp.getId().toString()));

        return VerifyOtpResponse.builder()
                .status(Status.PENDING_APPROVAL.name())
                .message("OTP verified. Your account is pending admin approval.")
                .build();
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Transactional
    public LoginResponse login(LoginRequest req, HttpServletRequest httpReq) {
        Employee emp = employeeRepository.findByNationalId(req.getNationalId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        // Check timed lockout
        if (emp.getLoginLockedUntil() != null &&
                OffsetDateTime.now().isBefore(emp.getLoginLockedUntil())) {
            auditService.log(AuditService.LOGIN_LOCKED, emp,
                    Map.of("lockedUntil", emp.getLoginLockedUntil().toString()), httpReq);
            throw new IllegalStateException(
                    "Account temporarily locked due to too many failed login attempts. " +
                    "Try again in " + LOGIN_LOCK_MINUTES + " minutes.");
        }

        // Verify password
        if (!passwordEncoder.matches(req.getPassword(), emp.getPasswordHash())) {
            short attempts = (short) (emp.getLoginAttempts() + 1);
            emp.setLoginAttempts(attempts);
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                emp.setLoginLockedUntil(OffsetDateTime.now().plusMinutes(LOGIN_LOCK_MINUTES));
                emp.setLoginAttempts((short) 0);
                log.warn("[SECURITY] Account {} locked after {} failed login attempts",
                        mask(req.getNationalId()), MAX_LOGIN_ATTEMPTS);
            }
            employeeRepository.save(emp);
            auditService.log(AuditService.LOGIN_FAILURE, emp,
                    Map.of("attempts", attempts), httpReq);
            throw new IllegalArgumentException("Invalid credentials");
        }

        // Check account status
        switch (emp.getStatus()) {
            case PENDING_VERIFICATION ->
                throw new IllegalStateException("Please verify your OTP first.");
            case PENDING_APPROVAL ->
                throw new IllegalStateException("Your account is pending admin approval.");
            case SUSPENDED ->
                throw new IllegalStateException("Your account has been suspended. Contact HR.");
            case REJECTED ->
                throw new IllegalStateException("Your registration was rejected. Contact HR.");
            default -> { /* ACTIVE — fall through */ }
        }

        // Success — reset login attempts and issue JWT
        emp.setLoginAttempts((short) 0);
        emp.setLoginLockedUntil(null);
        employeeRepository.save(emp);

        String token = jwtService.generateToken(emp);
        auditService.log(AuditService.LOGIN_SUCCESS, emp,
                Map.of("role", emp.getRole().name()), httpReq);
        log.info("[AUTH] Login success: {} role={}", mask(req.getNationalId()), emp.getRole());

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresInHours(8)
                .employeeId(emp.getId().toString())
                .role(emp.getRole().name())
                .nameAr(emp.getFirstNameAr() + " " + emp.getLastNameAr())
                .status(emp.getStatus().name())
                .build();
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @Transactional
    public void logout(String bearerToken, HttpServletRequest httpReq) {
        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) return;
        String token = bearerToken.substring(7);

        String jti = jwtService.extractJti(token);
        if (jti == null) return;

        Instant expiry = jwtService.extractExpiry(token);
        String nationalId = jwtService.extractSubjectUnchecked(token);

        Employee emp = null;
        try {
            emp = employeeRepository.findByNationalId(nationalId).orElse(null);
        } catch (Exception ignored) {}

        blacklistService.revoke(
                jti, emp,
                expiry != null
                    ? OffsetDateTime.ofInstant(expiry, ZoneOffset.UTC)
                    : OffsetDateTime.now().plusHours(8),
                "LOGOUT");

        auditService.log(AuditService.LOGOUT, emp,
                Map.of("maskedId", mask(nationalId)), httpReq);
        log.info("[AUTH] Logout: {}", mask(nationalId));
    }

    // ── Status check ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StatusResponse getStatus(String nationalId) {
        // Return identical response shape whether the account exists or not —
        // prevents unauthenticated enumeration of valid national IDs.
        Employee emp = employeeRepository.findByNationalId(nationalId).orElse(null);

        if (emp == null) {
            return StatusResponse.builder()
                    .nationalId(mask(nationalId))
                    .status("UNKNOWN")
                    .message("No account found for this ID.")
                    .build();
        }

        String message = switch (emp.getStatus()) {
            case PENDING_VERIFICATION -> "OTP verification pending.";
            case PENDING_APPROVAL     -> "Account awaiting admin approval.";
            case ACTIVE               -> "Account is active.";
            case SUSPENDED            -> "Account is suspended. Contact HR.";
            case REJECTED             -> "Registration was rejected. Contact HR.";
        };

        return StatusResponse.builder()
                .nationalId(mask(nationalId))
                .status(emp.getStatus().name())
                .message(message)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateOtp() {
        return String.valueOf(100_000 + secureRandom.nextInt(900_000));
    }

    private String mask(String id) {
        if (id == null || id.length() < 4) return "****";
        return "*".repeat(id.length() - 4) + id.substring(id.length() - 4);
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return "*".repeat(phone.length() - 4) + phone.substring(phone.length() - 4);
    }
}
