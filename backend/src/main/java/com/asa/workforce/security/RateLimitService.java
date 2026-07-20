package com.asa.workforce.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * In-memory sliding-window rate limiter (no Redis required for Stage 4).
 *
 * Each bucket is keyed by a string (typically "endpoint:clientIp").
 * Timestamps older than the window are purged on each check and by a
 * scheduled cleanup task.
 *
 * Thread-safe: uses ConcurrentHashMap + ConcurrentLinkedDeque.
 */
@Service
@Slf4j
public class RateLimitService {

    /** Predefined limits — tunable via application properties in a later stage */
    public static final int  REGISTER_MAX   = 5;    // 5 registrations
    public static final long REGISTER_WIN   = 60 * 60_000L; // per hour per IP

    public static final int  OTP_IP_MAX     = 15;   // 15 OTP attempts
    public static final long OTP_IP_WIN     = 60 * 60_000L; // per hour per IP

    public static final int  LOGIN_MAX      = 10;   // 10 login attempts
    public static final long LOGIN_WIN      = 60 * 60_000L; // per hour per IP

    public static final int  ADMIN_MAX      = 200;
    public static final long ADMIN_WIN      = 60 * 60_000L;

    // ── State ────────────────────────────────────────────────────────────────

    private final Map<String, Deque<Long>> buckets = new ConcurrentHashMap<>();

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Returns true if the request is allowed; false if the limit is exceeded.
     *
     * @param key        unique bucket key, e.g. "register:1.2.3.4"
     * @param maxEvents  maximum number of events in the window
     * @param windowMs   window duration in milliseconds
     */
    public boolean isAllowed(String key, int maxEvents, long windowMs) {
        Deque<Long> timestamps = buckets.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        long now    = System.currentTimeMillis();
        long cutoff = now - windowMs;

        // Prune expired entries from the front
        while (!timestamps.isEmpty() && timestamps.peekFirst() < cutoff) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxEvents) {
            log.warn("[RATE-LIMIT] Bucket '{}' exceeded ({}/{} in {}ms window)",
                    key, timestamps.size(), maxEvents, windowMs);
            return false;
        }

        timestamps.addLast(now);
        return true;
    }

    /** Remaining capacity for a key (useful for Retry-After headers). */
    public int remaining(String key, int maxEvents, long windowMs) {
        Deque<Long> d = buckets.get(key);
        if (d == null) return maxEvents;
        long cutoff = System.currentTimeMillis() - windowMs;
        long active = d.stream().filter(t -> t >= cutoff).count();
        return Math.max(0, (int) (maxEvents - active));
    }

    // ── Cleanup ──────────────────────────────────────────────────────────────

    /** Purge stale buckets every 5 minutes to prevent memory growth. */
    @Scheduled(fixedDelay = 5 * 60_000)
    void evictStaleBuckets() {
        long cutoff = System.currentTimeMillis() - Math.max(REGISTER_WIN, LOGIN_WIN);
        int removed = 0;
        for (var entry : buckets.entrySet()) {
            Deque<Long> d = entry.getValue();
            while (!d.isEmpty() && d.peekFirst() < cutoff) d.pollFirst();
            if (d.isEmpty()) {
                buckets.remove(entry.getKey());
                removed++;
            }
        }
        if (removed > 0) log.debug("[RATE-LIMIT] Evicted {} stale buckets", removed);
    }
}
