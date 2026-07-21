package com.asa.workforce.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/** Lightweight employee record used for admin pickers and employee list screens. */
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
    private String status;
    private String maskedPhone;
    private int    vacationDaysPerYear;
}
