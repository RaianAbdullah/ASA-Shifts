package com.asa.workforce.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/** Lightweight employee record used for admin pickers (schedule assignment, etc.) */
@Data
@Builder
public class EmployeeSummaryDto {
    private UUID   id;
    private String nationalId;
    private String firstNameAr;
    private String lastNameAr;
    private UUID   departmentId;
    private String departmentNameAr;
    private String role;
}
