package com.asa.workforce.attendance.controller;

import com.asa.workforce.attendance.dto.AdminAttendanceSummary;
import com.asa.workforce.attendance.service.AttendanceService;
import com.asa.workforce.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/attendance")
@RequiredArgsConstructor
@Tag(name = "Admin — Attendance", description = "Today's attendance dashboard for managers")
@SecurityRequirement(name = "bearerAuth")
public class AdminAttendanceController {

    private final AttendanceService attendanceService;

    /**
     * GET /v1/admin/attendance/today
     * Optional ?departmentId= filters to a single department.
     * DEPARTMENT_MANAGER can only see their own department (enforced in service layer in Stage 7).
     */
    @GetMapping("/today")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','MAIN_MANAGER','DEPARTMENT_MANAGER')")
    @Operation(summary = "Today's attendance summary — all employees or per department")
    public ResponseEntity<ApiResponse<AdminAttendanceSummary>> todaySummary(
            @RequestParam(required = false) UUID departmentId) {

        AdminAttendanceSummary data = attendanceService.getTodaySummary(departmentId);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }
}
