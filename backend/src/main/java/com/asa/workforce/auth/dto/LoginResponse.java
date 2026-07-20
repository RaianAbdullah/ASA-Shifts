package com.asa.workforce.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String  token;
    private String  tokenType;    // "Bearer"
    private int     expiresInHours;
    private String  employeeId;
    private String  role;
    private String  nameAr;
    private String  status;
}
