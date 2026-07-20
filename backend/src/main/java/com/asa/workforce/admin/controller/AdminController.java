package com.asa.workforce.admin.controller;

import com.asa.workforce.admin.dto.AdminActionRequest;
import com.asa.workforce.admin.dto.PendingEmployeeDto;
import com.asa.workforce.admin.service.AdminService;
import com.asa.workforce.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Admin-only endpoints. All routes require ROLE_ADMIN (enforced by SecurityConfig
 * at the URL level + @PreAuthorize for method-level defence-in-depth).
 */
@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Employee registration management")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService adminService;

    // ── GET /v1/admin/registrations/pending ──────────────────────────────────

    @GetMapping("/registrations/pending")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','MAIN_MANAGER')")
    @Operation(summary = "List employees awaiting approval (PENDING_APPROVAL)")
    public ResponseEntity<ApiResponse<Page<PendingEmployeeDto>>> listPending(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth,
            HttpServletRequest request) {

        Page<PendingEmployeeDto> data =
                adminService.listPending(page, size, auth.getName(), request);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    // ── PATCH /v1/admin/registrations/{id}/approve ───────────────────────────

    @PatchMapping("/registrations/{employeeId}/approve")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','MAIN_MANAGER')")
    @Operation(summary = "Approve a pending employee registration")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approve(
            @PathVariable UUID employeeId,
            Authentication auth,
            HttpServletRequest request) {

        Map<String, Object> result =
                adminService.approve(employeeId, auth.getName(), request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ── PATCH /v1/admin/registrations/{id}/reject ────────────────────────────

    @PatchMapping("/registrations/{employeeId}/reject")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','MAIN_MANAGER')")
    @Operation(summary = "Reject a pending employee registration")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reject(
            @PathVariable UUID employeeId,
            @Valid @RequestBody AdminActionRequest req,
            Authentication auth,
            HttpServletRequest request) {

        Map<String, Object> result =
                adminService.reject(employeeId, auth.getName(), req, request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
