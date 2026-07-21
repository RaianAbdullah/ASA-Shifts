package com.asa.workforce.message.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MessageDto(
    UUID            id,
    UUID            senderId,
    String          senderNameAr,
    String          senderRole,
    String          body,
    OffsetDateTime  sentAt
) {}
