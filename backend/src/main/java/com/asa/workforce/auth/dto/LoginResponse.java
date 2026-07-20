package com.asa.workforce.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;            // "Bearer"
    private long   accessExpiresInSeconds;
    private long   refreshExpiresInDays;
    private String employeeId;
    private String role;
    private String nameAr;
    private String status;
}
