package com.asa.workforce.audit;

import com.asa.workforce.entity.AuditLog;
import com.asa.workforce.entity.Employee;
import com.asa.workforce.repository.AuditLogRepository;
import com.asa.workforce.repository.EmployeeRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Writes immutable audit records for every security-relevant action.
 *
 * All writes are:
 * - Async (non-blocking for the caller)
 * - In a NEW transaction (audit records persist even if the calling transaction rolls back)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository  auditLogRepository;
    private final EmployeeRepository   employeeRepository;

    // ── Actions ──────────────────────────────────────────────────────────────

    public static final String LOGIN_SUCCESS      = "AUTH_LOGIN_SUCCESS";
    public static final String LOGIN_FAILURE      = "AUTH_LOGIN_FAILURE";
    public static final String LOGIN_LOCKED       = "AUTH_LOGIN_LOCKED";
    public static final String REGISTER           = "AUTH_REGISTER";
    public static final String OTP_VERIFY_SUCCESS = "AUTH_OTP_VERIFIED";
    public static final String OTP_VERIFY_FAILURE = "AUTH_OTP_FAILURE";
    public static final String OTP_LOCKED         = "AUTH_OTP_LOCKED";
    public static final String ADMIN_APPROVE      = "ADMIN_EMPLOYEE_APPROVED";
    public static final String ADMIN_REJECT       = "ADMIN_EMPLOYEE_REJECTED";
    public static final String ADMIN_PENDING_VIEW = "ADMIN_PENDING_LIST_VIEWED";
    public static final String PUSH_TOKEN_REG     = "PUSH_TOKEN_REGISTERED";
    public static final String CHECK_IN           = "ATTENDANCE_CHECK_IN";
    public static final String CHECK_OUT          = "ATTENDANCE_CHECK_OUT";

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Primary log method. Extracts IP/UA from the request SYNCHRONOUSLY on the
     * caller's thread before handing off to the async executor — Tomcat recycles
     * the request object immediately after the controller returns, so we must not
     * read it inside the @Async thread.
     */
    public void log(String action,
                    Employee actor,
                    String resourceType,
                    UUID resourceId,
                    Map<String, Object> details,
                    HttpServletRequest request) {
        // Extract before async hand-off
        String ip = extractIp(request);
        String ua = extractUserAgent(request);
        UUID   actorId = actor != null ? actor.getId() : null;
        doLog(action, actorId, resourceType, resourceId, details, ip, ua);
    }

    /** Convenience — log without a resource. */
    public void log(String action, Employee actor, Map<String, Object> details,
                    HttpServletRequest request) {
        log(action, actor, null, null, details, request);
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    protected void doLog(String action, UUID actorId,
                         String resourceType, UUID resourceId,
                         Map<String, Object> details, String ip, String ua) {
        try {
            Employee managedActor = null;
            if (actorId != null) {
                managedActor = employeeRepository.findById(actorId).orElse(null);
            }
            AuditLog entry = AuditLog.builder()
                    .action(action)
                    .actor(managedActor)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .details(details)
                    .ipAddress(ip)
                    .userAgent(ua)
                    .build();
            auditLogRepository.save(entry);
            log.debug("[AUDIT] {} actor={} resource={}:{}",
                    action,
                    managedActor != null ? managedActor.getNationalId() : "anonymous",
                    resourceType, resourceId);
        } catch (Exception ex) {
            log.error("[AUDIT] Failed to persist audit record: {}", ex.getMessage(), ex);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String extractIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String extractUserAgent(HttpServletRequest request) {
        if (request == null) return null;
        String ua = request.getHeader("User-Agent");
        // Truncate to avoid storing huge UA strings
        return ua != null && ua.length() > 512 ? ua.substring(0, 512) : ua;
    }
}
