package com.asa.workforce.message.controller;

import com.asa.workforce.common.dto.ApiResponse;
import com.asa.workforce.message.dto.CreateMessageRequest;
import com.asa.workforce.message.dto.MessageDto;
import com.asa.workforce.message.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/messages")
@RequiredArgsConstructor
@Tag(name = "Messages", description = "Group chat — any active employee can send and receive")
public class MessageController {

    private final MessageService service;

    @GetMapping
    @Operation(summary = "Get recent messages (up to 50), or messages after ?after=<ISO timestamp>")
    public ResponseEntity<ApiResponse<List<MessageDto>>> list(
            @RequestParam(required = false) OffsetDateTime after) {
        List<MessageDto> msgs = after != null
                ? service.listAfter(after)
                : service.listRecent();
        return ResponseEntity.ok(ApiResponse.ok(msgs));
    }

    @PostMapping
    @Operation(summary = "Send a message (any active employee)")
    public ResponseEntity<ApiResponse<MessageDto>> send(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody CreateMessageRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.send(user.getUsername(), req)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a message (sender or admin/manager)")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        service.delete(user.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
