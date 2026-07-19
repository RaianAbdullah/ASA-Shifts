package com.asa.workforce.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration for ASA Workforce.
 *
 * STAGE 1 NOTE: All requests are temporarily permitted to allow
 * infrastructure validation. JWT authentication will be added in Stage 4.
 *
 * Security hardening per stage:
 *  Stage 1:  Permit all (infrastructure only)
 *  Stage 3:  Permit only public registration/OTP endpoints
 *  Stage 4:  JWT filter, stateless sessions, deny-by-default
 *  Stage 5:  Role and ownership enforcement
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF — stateless JWT API does not use CSRF tokens.
            // Cookie-based CSRF is not applicable for a mobile REST API.
            .csrf(AbstractHttpConfigurer::disable)

            // Stateless session — no HttpSession is created or used.
            // All auth state lives in the short-lived JWT access token.
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // STAGE 1: Permit all until JWT is implemented (Stage 4)
            // TODO Stage 4: Replace with JWT filter and deny-by-default policy
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
