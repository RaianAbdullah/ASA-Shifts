package com.asa.workforce.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Reads the Authorization: Bearer <token> header, validates the JWT,
 * and sets the Spring Security context for the request.
 *
 * Token validation failures are silently skipped — the request continues
 * unauthenticated, and Spring Security's authorization layer rejects it
 * if the endpoint requires authentication.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);

        if (!jwtService.isValid(token)) {
            chain.doFilter(request, response);
            return;
        }

        try {
            Claims claims     = jwtService.parseToken(token);
            String nationalId = claims.getSubject();
            String role       = claims.get("role", String.class);
            String employeeId = claims.get("employeeId", String.class);

            var auth = new UsernamePasswordAuthenticationToken(
                    nationalId,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
            auth.setDetails(employeeId);
            SecurityContextHolder.getContext().setAuthentication(auth);

        } catch (Exception ex) {
            log.debug("JWT processing failed — treating as unauthenticated: {}", ex.getMessage());
        }

        chain.doFilter(request, response);
    }
}
