package com.asa.workforce.vacation.service;

import com.asa.workforce.entity.Employee;
import com.asa.workforce.entity.VacationRequest;
import com.asa.workforce.entity.VacationRequest.VacationStatus;
import com.asa.workforce.repository.EmployeeRepository;
import com.asa.workforce.repository.VacationRequestRepository;
import com.asa.workforce.vacation.dto.ReviewVacationRequest;
import com.asa.workforce.vacation.dto.SubmitVacationRequest;
import com.asa.workforce.vacation.dto.VacationRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VacationService {

    private final VacationRequestRepository vacationRepository;
    private final EmployeeRepository        employeeRepository;

    // ── Employee: submit ──────────────────────────────────────────────────────

    @Transactional
    public VacationRequestDto submit(String nationalId, SubmitVacationRequest req) {
        Employee emp = employeeRepository.findByNationalId(nationalId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (emp.getStatus() != Employee.Status.ACTIVE) {
            throw new IllegalStateException("Only active employees can submit vacation requests");
        }
        if (req.getStartDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Start date cannot be in the past");
        }
        if (!req.getEndDate().isAfter(req.getStartDate()) &&
                !req.getEndDate().equals(req.getStartDate())) {
            throw new IllegalArgumentException("End date must be on or after start date");
        }

        VacationRequest vr = VacationRequest.builder()
                .employee(emp)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .reason(req.getReason())
                .status(VacationStatus.PENDING)
                .build();

        return toDto(vacationRepository.save(vr));
    }

    // ── Employee: view own ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<VacationRequestDto> getMyRequests(String nationalId) {
        Employee emp = employeeRepository.findByNationalId(nationalId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        return vacationRepository.findByEmployeeIdOrderByCreatedAtDesc(emp.getId())
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public void cancel(String nationalId, UUID requestId) {
        Employee emp = employeeRepository.findByNationalId(nationalId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        VacationRequest vr = vacationRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!vr.getEmployee().getId().equals(emp.getId())) {
            throw new SecurityException("Request does not belong to this employee");
        }
        if (vr.getStatus() != VacationStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be cancelled");
        }
        vr.setStatus(VacationStatus.CANCELLED);
        vacationRepository.save(vr);
    }

    // ── Admin/Manager: list pending ────────────────────────────────────────────

    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'MAIN_MANAGER', 'DEPARTMENT_MANAGER')")
    @Transactional(readOnly = true)
    public List<VacationRequestDto> getPending() {
        return vacationRepository.findByStatusOrderByCreatedAtAsc(VacationStatus.PENDING)
                .stream().map(this::toDto).toList();
    }

    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'MAIN_MANAGER', 'DEPARTMENT_MANAGER')")
    @Transactional(readOnly = true)
    public List<VacationRequestDto> getAll() {
        return vacationRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream().map(this::toDto).toList();
    }

    // ── Admin/Manager: approve / reject ────────────────────────────────────────

    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'MAIN_MANAGER', 'DEPARTMENT_MANAGER')")
    @Transactional
    public VacationRequestDto approve(String reviewerNationalId, UUID requestId, ReviewVacationRequest body) {
        return review(reviewerNationalId, requestId, VacationStatus.APPROVED, body.getNotes());
    }

    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'MAIN_MANAGER', 'DEPARTMENT_MANAGER')")
    @Transactional
    public VacationRequestDto reject(String reviewerNationalId, UUID requestId, ReviewVacationRequest body) {
        return review(reviewerNationalId, requestId, VacationStatus.REJECTED, body.getNotes());
    }

    private VacationRequestDto review(String reviewerNationalId, UUID requestId,
                                      VacationStatus decision, String notes) {
        Employee reviewer = employeeRepository.findByNationalId(reviewerNationalId)
                .orElseThrow(() -> new IllegalArgumentException("Reviewer not found"));
        VacationRequest vr = vacationRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (vr.getStatus() != VacationStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be reviewed");
        }

        vr.setStatus(decision);
        vr.setReviewedBy(reviewer);
        vr.setReviewedAt(OffsetDateTime.now());
        vr.setReviewNotes(notes);
        return toDto(vacationRepository.save(vr));
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    private VacationRequestDto toDto(VacationRequest vr) {
        Employee emp  = vr.getEmployee();
        Employee dept_emp = emp;  // same entity — read lazily
        String deptNameAr = (emp.getDepartment() != null) ? emp.getDepartment().getNameAr() : null;
        Employee reviewer = vr.getReviewedBy();

        int totalDays = (int) (vr.getEndDate().toEpochDay() - vr.getStartDate().toEpochDay() + 1);

        return VacationRequestDto.builder()
                .id(vr.getId())
                .employeeId(emp.getId())
                .employeeNameAr(emp.getFirstNameAr() + " " + emp.getLastNameAr())
                .departmentNameAr(deptNameAr)
                .startDate(vr.getStartDate())
                .endDate(vr.getEndDate())
                .totalDays(totalDays)
                .reason(vr.getReason())
                .status(vr.getStatus().name())
                .reviewerNameAr(reviewer != null
                        ? reviewer.getFirstNameAr() + " " + reviewer.getLastNameAr() : null)
                .reviewedAt(vr.getReviewedAt())
                .reviewNotes(vr.getReviewNotes())
                .createdAt(vr.getCreatedAt())
                .build();
    }
}
