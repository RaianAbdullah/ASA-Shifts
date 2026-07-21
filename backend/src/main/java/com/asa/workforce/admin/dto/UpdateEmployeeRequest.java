package com.asa.workforce.admin.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class UpdateEmployeeRequest {
    private String  firstNameAr;
    private String  lastNameAr;
    private String  phoneNumber;
    private String  role;
    private String  status;
    private UUID    departmentId;
    private Integer vacationDaysPerYear;
}
