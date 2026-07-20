package com.asa.workforce.vacation.controller;

import com.asa.workforce.common.dto.ApiResponse;
import com.asa.workforce.vacation.dto.ReviewVacationRequest;
import com.asa.workforce.vacation.dto.SubmitVacationRequest;
import com.asa.workforce.vacation.dto.VacationRequestDto;
import com.asa.workforce.vacation.service.VacationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/vacations")
@RequiredArgsConstructor
@Tag(name = "Vacations", description = "Vacation request management")
public class VacationController {

    private final VacationService vacationService;

    // ── Employee endpoints ────────────────────────────────────────────────────

    @PostMapping
    @Operation(summary = "Submit a vacation request")
    public ResponseEntity<ApiResponse<VacationRequestDto>> submit(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody SubmitVacationRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(vacationService.submit(user.getUsername(), request)));
    }

    @GetMapping("/my")
    @Operation(summary = "Get the current employee's vacation requests")
    public ResponseEntity<ApiResponse<List<VacationRequestDto>>> getMyRequests(
            @AuthenticationPrincipal UserDetails user) {

        return ResponseEntity.ok(ApiResponse.ok(vacationService.getMyRequests(user.getUsername())));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel a pending vacation request")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {

        vacationService.cancel(user.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Manager/Admin endpoints ───────────────────────────────────────────────

    @GetMapping("/pending")
    @Operation(summary = "List pending vacation requests (manager/admin)")
    public ResponseEntity<ApiResponse<List<VacationRequestDto>>> getPending() {
        return ResponseEntity.ok(ApiResponse.ok(vacationService.getPending()));
    }

    @GetMapping("/all")
    @Operation(summary = "List all vacation requests (manager/admin)")
    public ResponseEntity<ApiResponse<List<VacationRequestDto>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(vacationService.getAll()));
    }

    @PatchMapping("/{id}/approve")
    @Operation(summary = "Approve a vacation request (manager/admin)")
    public ResponseEntity<ApiResponse<VacationRequestDto>> approve(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id,
            @RequestBody(required = false) ReviewVacationRequest body) {

        return ResponseEntity.ok(ApiResponse.ok(
                vacationService.approve(user.getUsername(), id,
                        body != null ? body : new ReviewVacationRequest())));
    }

    @PatchMapping("/{id}/reject")
    @Operation(summary = "Reject a vacation request (manager/admin)")
    public ResponseEntity<ApiResponse<VacationRequestDto>> reject(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id,
            @RequestBody(required = false) ReviewVacationRequest body) {

        return ResponseEntity.ok(ApiResponse.ok(
                vacationService.reject(user.getUsername(), id,
                        body != null ? body : new ReviewVacationRequest())));
    }
}
