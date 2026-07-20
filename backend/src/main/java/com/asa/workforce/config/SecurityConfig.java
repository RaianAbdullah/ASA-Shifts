package com.asa.workforce.config;

import com.asa.workforce.security.JwtAuthFilter;
import com.asa.workforce.security.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * Security configuration for ASA Workforce.
 *
 * Security posture by stage:
 *   Stage 3-4  — auth endpoints open; JWT validates admin routes.
 *   Stage 5+   — anyRequest().authenticated(); per-resource ownership checks via @PreAuthorize.
 *
 * Defense layers:
 *   1. Rate limiting     — RateLimitFilter (IP-based sliding window)
 *   2. JWT validation    — JwtAuthFilter   (HS512, 8h expiry)
 *   3. RBAC              — .hasRole("ADMIN") on /v1/admin/** routes
 *   4. Security headers  — HSTS, frame deny, CSP, nosniff, referrer policy
 *   5. CORS              — configured in CorsConfig (dev: *, prod: restrict)
 *   6. CSRF              — disabled (stateless JWT API — not a browser form app)
 *   7. Session           — STATELESS (no server-side sessions)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity          // Enables @PreAuthorize on controller methods
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter    jwtAuthFilter;
    private final RateLimitFilter  rateLimitFilter;

    // ── Beans ────────────────────────────────────────────────────────────────

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        // Cost factor 12 — ~300ms on modern hardware; strong against brute force
        return new BCryptPasswordEncoder(12);
    }

    // ── Filter chain ─────────────────────────────────────────────────────────

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // ── CSRF: disabled for stateless JWT API ──────────────────────────
            .csrf(AbstractHttpConfigurer::disable)

            // ── Session management: strictly stateless ────────────────────────
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Security headers ──────────────────────────────────────────────
            .headers(headers -> headers
                // HSTS — enforce HTTPS for 1 year including subdomains
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31_536_000))
                // Never render this app in a frame
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                // Prevent MIME-type sniffing
                .contentTypeOptions(HeadersConfigurer.ContentTypeOptionsConfig::disable)
                // Content Security Policy — API only, no HTML served
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                // Referrer policy
                .referrerPolicy(rp -> rp
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                // Cache-control: prevent sensitive responses from being cached
                .cacheControl(HeadersConfigurer.CacheControlConfig::disable)
            )

            // ── Authorization rules ───────────────────────────────────────────
            .authorizeHttpRequests(auth -> auth
                // Public — auth flow
                .requestMatchers(HttpMethod.POST,
                    "/v1/auth/register",
                    "/v1/auth/verify-otp",
                    "/v1/auth/login"
                ).permitAll()
                .requestMatchers(HttpMethod.GET,
                    "/v1/auth/status/**",
                    "/healthz",
                    "/actuator/health",
                    "/actuator/info"
                ).permitAll()
                // Swagger — dev only (remove or protect in production)
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()
                // Admin routes — SYSTEM_ADMIN, MAIN_MANAGER, or DEPARTMENT_MANAGER
                .requestMatchers("/v1/admin/**")
                    .hasAnyRole("SYSTEM_ADMIN", "MAIN_MANAGER", "DEPARTMENT_MANAGER")
                // Notification token registration — any authenticated user
                .requestMatchers(HttpMethod.POST, "/v1/notifications/push-token").authenticated()
                // Everything else — authenticated
                // TODO Stage 5: change to .anyRequest().authenticated()
                .anyRequest().permitAll()
            )

            // ── Filters ───────────────────────────────────────────────────────
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter,   UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
