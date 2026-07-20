package com.asa.workforce.security;

import com.asa.workforce.entity.Employee;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and validates HS512 JWTs.
 *
 * Secret must be provided via JWT_SECRET env-var (≥ 64 bytes recommended).
 * A dev-only default is used when the env-var is absent — it will NEVER work
 * in production because the default is a well-known insecure string.
 */
@Service
@Slf4j
public class JwtService {

    private static final String DEV_DEFAULT =
            "ASA_WORKFORCE_DEV_ONLY_INSECURE_SECRET_SET_JWT_SECRET_IN_PRODUCTION_64_BYTES_MIN!!";

    @Value("${jwt.secret:" + DEV_DEFAULT + "}")
    private String secret;

    @Value("${jwt.expiry-hours:8}")
    private int expiryHours;

    private SecretKey key;

    @PostConstruct
    void init() {
        if (DEV_DEFAULT.equals(secret)) {
            log.error("╔═══════════════════════════════════════════════════════════════╗");
            log.error("║  SECURITY WARNING: JWT_SECRET is not set!                    ║");
            log.error("║  Using insecure development default. Set JWT_SECRET before   ║");
            log.error("║  any production or staging deployment.                       ║");
            log.error("╚═══════════════════════════════════════════════════════════════╝");
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    // ── Token generation ─────────────────────────────────────────────────────

    public String generateToken(Employee employee) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(employee.getNationalId())
                .id(UUID.randomUUID().toString())          // jti for future revocation
                .claim("employeeId", employee.getId().toString())
                .claim("role", employee.getRole().name())
                .claim("name", employee.getFirstNameAr() + " " + employee.getLastNameAr())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiryHours, ChronoUnit.HOURS)))
                .signWith(key, Jwts.SIG.HS512)
                .compact();
    }

    // ── Token parsing ────────────────────────────────────────────────────────

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.debug("JWT expired: {}", e.getMessage());
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT invalid: {}", e.getMessage());
        }
        return false;
    }

    /** Extract just the nationalId (subject) without full validation — use only for logging. */
    public String extractSubjectUnchecked(String token) {
        try {
            return parseToken(token).getSubject();
        } catch (Exception e) {
            return "unknown";
        }
    }
}
