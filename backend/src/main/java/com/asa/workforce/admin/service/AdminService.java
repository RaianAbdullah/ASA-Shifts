package com.asa.workforce.admin.service;

import com.asa.workforce.admin.dto.AdminActionRequest;
import com.asa.workforce.admin.dto.CreateEmployeeRequest;
import com.asa.workforce.admin.dto.CreateEmployeeResponse;
import com.asa.workforce.admin.dto.EmployeeSummaryDto;
import com.asa.workforce.admin.dto.PendingEmployeeDto;
import com.asa.workforce.admin.dto.UpdateEmployeeRequest;
import com.asa.workforce.audit.AuditService;
import com.asa.workforce.entity.Department;
import com.asa.workforce.entity.Employee;
import com.asa.workforce.entity.Employee.Status;
import com.asa.workforce.notification.PushNotificationService;
import com.asa.workforce.repository.DepartmentRepository;
import com.asa.workforce.repository.EmployeeRepository;
import com.asa.workforce.repository.PushTokenRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final EmployeeRepository      employeeRepository;
    private final DepartmentRepository    departmentRepository;
    private final PushTokenRepository     pushTokenRepository;
    private final PushNotificationService pushService;
    private final AuditService            auditService;
    private final BCryptPasswordEncoder   passwordEncoder;

    // ── List pending ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<PendingEmployeeDto> listPending(int page, int size, String adminNationalId,
                                                HttpServletRequest httpReq) {
        Employee admin = employeeRepository.findByNationalId(adminNationalId)
                .orElseThrow(() -> new IllegalArgumentException("Approver not found"));

        boolean isApprover = admin.getRole() == Employee.Role.SYSTEM_ADMIN
                || admin.getRole() == Employee.Role.MAIN_MANAGER;
        if (!isApprover) {
            throw new IllegalStateException("Only System Admins and Main Managers can view pending registrations");
        }

        auditService.log(AuditService.ADMIN_PENDING_VIEW, admin,
                Map.of("page", page, "size", size), httpReq);

        return employeeRepository
                .findByStatus(Status.PENDING_APPROVAL,
                        PageRequest.of(page, size, Sort.by("updatedAt").descending()))
                .map(this::toDto);
    }

    // ── Approve ──────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> approve(UUID employeeId, String adminNationalId,
                                       HttpServletRequest httpReq) {
        Employee admin = employeeRepository.findByNationalId(adminNationalId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        Employee emp   = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (emp.getStatus() != Status.PENDING_APPROVAL) {
            throw new IllegalStateException(
                    "Employee is not in PENDING_APPROVAL status (current: " + emp.getStatus() + ")");
        }

        emp.setStatus(Status.ACTIVE);
        emp.setReviewedBy(admin.getId());
        emp.setReviewedAt(OffsetDateTime.now());
        employeeRepository.save(emp);

        auditService.log(AuditService.ADMIN_APPROVE, admin, "EMPLOYEE", emp.getId(),
                Map.of("employeeName", emp.getFirstNameAr() + " " + emp.getLastNameAr(),
                        "newStatus", "ACTIVE"),
                httpReq);

        log.info("[ADMIN] {} approved employee {}", adminNationalId, employeeId);

        // Notify the employee — non-fatal: a push failure must never roll back the approval
        try {
            List<String> tokens = pushTokenRepository.findTokensByEmployeeId(emp.getId());
            pushService.sendToTokens(tokens,
                    "تمت الموافقة على حسابك — Account Approved",
                    "Your account has been approved. You can now sign in to ASA Workforce.",
                    Map.of("type", "ACCOUNT_APPROVED"));
        } catch (Exception ex) {
            log.warn("[ADMIN] Push notification failed for approved employee {} — approval is still saved",
                    employeeId, ex);
        }

        return Map.of("employeeId", employeeId.toString(),
                "newStatus", "ACTIVE",
                "approvedBy", adminNationalId,
                "approvedAt", emp.getReviewedAt().toString());
    }

    // ── Reject ───────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> reject(UUID employeeId, String adminNationalId,
                                      AdminActionRequest req, HttpServletRequest httpReq) {
        Employee admin = employeeRepository.findByNationalId(adminNationalId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        Employee emp   = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (emp.getStatus() != Status.PENDING_APPROVAL) {
            throw new IllegalStateException(
                    "Employee is not in PENDING_APPROVAL status (current: " + emp.getStatus() + ")");
        }

        String reason = req.getReason() != null ? req.getReason() : "No reason provided";
        emp.setStatus(Status.REJECTED);
        emp.setRejectionReason(reason);
        emp.setReviewedBy(admin.getId());
        emp.setReviewedAt(OffsetDateTime.now());
        employeeRepository.save(emp);

        auditService.log(AuditService.ADMIN_REJECT, admin, "EMPLOYEE", emp.getId(),
                Map.of("employeeName", emp.getFirstNameAr() + " " + emp.getLastNameAr(),
                        "reason", reason,
                        "newStatus", "REJECTED"),
                httpReq);

        log.info("[ADMIN] {} rejected employee {} — reason: {}", adminNationalId, employeeId, reason);

        // Notify the employee — non-fatal: a push failure must never roll back the rejection
        try {
            List<String> tokens = pushTokenRepository.findTokensByEmployeeId(emp.getId());
            pushService.sendToTokens(tokens,
                    "تم رفض طلبك — Registration Rejected",
                    "Your registration request was not approved. Please contact HR for details.",
                    Map.of("type", "ACCOUNT_REJECTED"));
        } catch (Exception ex) {
            log.warn("[ADMIN] Push notification failed for rejected employee {} — rejection is still saved",
                    employeeId, ex);
        }

        return Map.of("employeeId", employeeId.toString(),
                "newStatus", "REJECTED",
                "rejectedBy", adminNationalId,
                "rejectedAt", emp.getReviewedAt().toString());
    }

    // ── DTO mapping ──────────────────────────────────────────────────────────

    private PendingEmployeeDto toDto(Employee emp) {
        return PendingEmployeeDto.builder()
                .id(emp.getId().toString())
                .nationalId(maskId(emp.getNationalId()))
                .firstNameAr(emp.getFirstNameAr())
                .lastNameAr(emp.getLastNameAr())
                .maskedPhone(maskPhone(emp.getPhoneNumber()))
                .status(emp.getStatus().name())
                .registeredAt(emp.getCreatedAt())
                .otpVerifiedAt(emp.getUpdatedAt())
                .build();
    }

    // ── Create employee (admin-direct, no signup flow) ────────────────────────

    @Transactional
    public CreateEmployeeResponse createEmployee(CreateEmployeeRequest req,
                                                 String adminNationalId,
                                                 HttpServletRequest httpReq) {
        if (employeeRepository.existsByNationalId(req.getNationalId())) {
            throw new IllegalArgumentException("National ID already registered");
        }
        if (employeeRepository.existsByPhoneNumber(req.getPhoneNumber())) {
            throw new IllegalArgumentException("Phone number already registered");
        }

        Department dept = null;
        if (req.getDepartmentId() != null && !req.getDepartmentId().isBlank()) {
            dept = departmentRepository.findById(UUID.fromString(req.getDepartmentId()))
                    .orElseThrow(() -> new IllegalArgumentException("Department not found"));
        }

        Employee.Role role;
        try {
            role = Employee.Role.valueOf(req.getRole());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid role: " + req.getRole());
        }

        // Temp password = national ID; employee must change on first login
        String tempPassword = req.getNationalId();

        Employee emp = Employee.builder()
                .nationalId(req.getNationalId())
                .firstNameAr(req.getFirstNameAr())
                .lastNameAr(req.getLastNameAr())
                .phoneNumber(req.getPhoneNumber())
                .department(dept)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .role(role)
                .status(Status.ACTIVE)
                .mustChangePassword(true)
                .build();

        emp = employeeRepository.save(emp);

        Employee admin = employeeRepository.findByNationalId(adminNationalId).orElse(null);
        auditService.log(AuditService.ADMIN_APPROVE, admin, "EMPLOYEE", emp.getId(),
                Map.of("action", "admin_created",
                       "employeeName", emp.getFirstNameAr() + " " + emp.getLastNameAr(),
                       "role", role.name()),
                httpReq);

        log.info("[ADMIN] {} created employee {} ({})", adminNationalId, emp.getId(), role);

        return CreateEmployeeResponse.builder()
                .employeeId(emp.getId().toString())
                .nationalId(emp.getNationalId())
                .firstNameAr(emp.getFirstNameAr())
                .lastNameAr(emp.getLastNameAr())
                .role(role.name())
                .departmentNameAr(dept != null ? dept.getNameAr() : null)
                .tempPassword(tempPassword)
                .message("Account created. Share the temporary password with the employee.")
                .build();
    }

    // ── List all employees (admin employee management screen) ─────────────────

    @Transactional(readOnly = true)
    public List<EmployeeSummaryDto> listAllEmployees() {
        return employeeRepository.findAll(Sort.by("firstNameAr"))
                .stream()
                .map(e -> EmployeeSummaryDto.builder()
                        .id(e.getId())
                        .nationalId(e.getNationalId())
                        .firstNameAr(e.getFirstNameAr())
                        .lastNameAr(e.getLastNameAr())
                        .departmentId(e.getDepartment() != null ? e.getDepartment().getId() : null)
                        .departmentNameAr(e.getDepartment() != null ? e.getDepartment().getNameAr() : null)
                        .role(e.getRole().name())
                        .status(e.getStatus().name())
                        .maskedPhone(maskPhone(e.getPhoneNumber()))
                        .vacationDaysPerYear(e.getVacationDaysPerYear())
                        .build())
                .toList();
    }

    // ── List active employees (for pickers — schedules, vacations, etc.) ──────

    @Transactional(readOnly = true)
    public List<EmployeeSummaryDto> listActiveEmployees() {
        return employeeRepository.findByStatusOrderByFirstNameArAsc(Status.ACTIVE)
                .stream()
                .map(e -> EmployeeSummaryDto.builder()
                        .id(e.getId())
                        .nationalId(e.getNationalId())
                        .firstNameAr(e.getFirstNameAr())
                        .lastNameAr(e.getLastNameAr())
                        .departmentId(e.getDepartment() != null ? e.getDepartment().getId() : null)
                        .departmentNameAr(e.getDepartment() != null ? e.getDepartment().getNameAr() : null)
                        .role(e.getRole().name())
                        .build())
                .toList();
    }

    // ── Update employee (role, status, details, vacation days) ───────────────

    @Transactional
    public EmployeeSummaryDto updateEmployee(UUID employeeId, UpdateEmployeeRequest req) {
        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (req.getFirstNameAr()  != null) emp.setFirstNameAr(req.getFirstNameAr());
        if (req.getLastNameAr()   != null) emp.setLastNameAr(req.getLastNameAr());
        if (req.getPhoneNumber()  != null) emp.setPhoneNumber(req.getPhoneNumber());
        if (req.getVacationDaysPerYear() != null) emp.setVacationDaysPerYear(req.getVacationDaysPerYear());

        if (req.getRole() != null) {
            try { emp.setRole(Employee.Role.valueOf(req.getRole())); }
            catch (IllegalArgumentException ex) { throw new IllegalArgumentException("Invalid role: " + req.getRole()); }
        }
        if (req.getStatus() != null) {
            try { emp.setStatus(Employee.Status.valueOf(req.getStatus())); }
            catch (IllegalArgumentException ex) { throw new IllegalArgumentException("Invalid status: " + req.getStatus()); }
        }
        if (req.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(req.getDepartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Department not found"));
            emp.setDepartment(dept);
        }

        emp = employeeRepository.save(emp);

        return EmployeeSummaryDto.builder()
                .id(emp.getId())
                .nationalId(emp.getNationalId())
                .firstNameAr(emp.getFirstNameAr())
                .lastNameAr(emp.getLastNameAr())
                .departmentId(emp.getDepartment() != null ? emp.getDepartment().getId() : null)
                .departmentNameAr(emp.getDepartment() != null ? emp.getDepartment().getNameAr() : null)
                .role(emp.getRole().name())
                .status(emp.getStatus().name())
                .maskedPhone(maskPhone(emp.getPhoneNumber()))
                .vacationDaysPerYear(emp.getVacationDaysPerYear())
                .build();
    }

    private String maskId(String id) {
        if (id == null || id.length() < 4) return "****";
        return "******" + id.substring(id.length() - 4);
    }

    private String maskPhone(String p) {
        if (p == null || p.length() < 4) return "****";
        return "*".repeat(p.length() - 4) + p.substring(p.length() - 4);
    }
}
