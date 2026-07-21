package com.asa.workforce.message.service;

import com.asa.workforce.entity.Employee;
import com.asa.workforce.entity.Message;
import com.asa.workforce.message.dto.CreateMessageRequest;
import com.asa.workforce.message.dto.MessageDto;
import com.asa.workforce.message.repository.MessageRepository;
import com.asa.workforce.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageService {

    private static final int PAGE_SIZE = 50;

    private final MessageRepository  messageRepository;
    private final EmployeeRepository employeeRepository;

    /** Latest PAGE_SIZE messages, returned oldest-first for chat rendering */
    @Transactional(readOnly = true)
    public List<MessageDto> listRecent() {
        List<Message> msgs = messageRepository.findRecentMessages(PAGE_SIZE);
        Collections.reverse(msgs);   // flip from newest-desc to oldest-first
        return msgs.stream().map(this::toDto).toList();
    }

    /** All messages sent after `after` (used for polling), oldest-first */
    @Transactional(readOnly = true)
    public List<MessageDto> listAfter(OffsetDateTime after) {
        return messageRepository.findAfter(after).stream()
                .map(this::toDto).toList();
    }

    /** Send a message — any authenticated active employee */
    @Transactional
    public MessageDto send(String nationalId, CreateMessageRequest req) {
        Employee sender = findEmployee(nationalId);
        Message m = Message.builder()
                .sender(sender)
                .body(req.body().strip())
                .build();
        return toDto(messageRepository.save(m));
    }

    /** Delete — only the sender or an admin/manager */
    @Transactional
    public void delete(String nationalId, UUID id) {
        Message m = messageRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Message not found: " + id));
        Employee requester = findEmployee(nationalId);
        boolean isSender = m.getSender().getId().equals(requester.getId());
        boolean isAdmin  = switch (requester.getRole()) {
            case SYSTEM_ADMIN, MAIN_MANAGER, DEPARTMENT_MANAGER -> true;
            default -> false;
        };
        if (!isSender && !isAdmin) {
            throw new SecurityException("Not allowed to delete this message");
        }
        messageRepository.delete(m);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Employee findEmployee(String nationalId) {
        return employeeRepository.findByNationalId(nationalId)
                .orElseThrow(() -> new NoSuchElementException("Employee not found: " + nationalId));
    }

    private MessageDto toDto(Message m) {
        Employee s = m.getSender();
        return new MessageDto(
            m.getId(),
            s.getId(),
            s.getFirstNameAr() + " " + s.getLastNameAr(),
            s.getRole().name(),
            m.getBody(),
            m.getSentAt()
        );
    }
}
