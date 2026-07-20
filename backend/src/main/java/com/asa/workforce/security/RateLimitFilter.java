package com.asa.workforce.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Per-IP rate limiting for auth endpoints.
 *
 * Limits (sliding window):
 *   POST /v1/auth/register   → 5 / hour   per IP
 *   POST /v1/auth/verify-otp → 15 / hour  per IP  (per-account limit also in AuthService)
 *   POST /v1/auth/login      → 10 / hour  per IP  (per-account limit also in AuthService)
 *   /v1/admin/**             → 200 / hour per IP
 *
 * Returns 429 Too Many Requests with a JSON body on breach.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    private static final String JSON_429 =
            "{\"success\":false,\"error\":{\"code\":\"RATE_LIMITED\"," +
            "\"message\":\"Too many requests. Please try again later.\"}}";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        String ip   = extractIp(request);
        String path = request.getRequestURI();

        boolean allowed;
        if (path.equals("/api/v1/auth/register")) {
            allowed = rateLimitService.isAllowed("register:" + ip,
                    RateLimitService.REGISTER_MAX, RateLimitService.REGISTER_WIN);
        } else if (path.equals("/api/v1/auth/verify-otp")) {
            allowed = rateLimitService.isAllowed("otp:" + ip,
                    RateLimitService.OTP_IP_MAX, RateLimitService.OTP_IP_WIN);
        } else if (path.equals("/api/v1/auth/login")) {
            allowed = rateLimitService.isAllowed("login:" + ip,
                    RateLimitService.LOGIN_MAX, RateLimitService.LOGIN_WIN);
        } else if (path.startsWith("/api/v1/admin/")) {
            allowed = rateLimitService.isAllowed("admin:" + ip,
                    RateLimitService.ADMIN_MAX, RateLimitService.ADMIN_WIN);
        } else {
            allowed = true;
        }

        if (!allowed) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(JSON_429);
            return;
        }

        chain.doFilter(request, response);
    }

    private String extractIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
