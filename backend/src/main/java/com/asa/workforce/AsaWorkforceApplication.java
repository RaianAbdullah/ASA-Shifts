package com.asa.workforce;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ASA Workforce — Secure Workforce Mobile Application System
 *
 * Main entry point for the Spring Boot application.
 * Security is designed from the start — not added later.
 *
 * Development stages:
 *  Stage 1:  Project foundation (current)
 *  Stage 2:  Database and core models
 *  Stage 3:  Secure registration
 *  Stage 4:  JWT authentication
 *  Stage 5:  Authorization
 *  Stage 6+: Features
 */
@SpringBootApplication
public class AsaWorkforceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AsaWorkforceApplication.class, args);
    }
}
