package com.asa.workforce.repository;

import com.asa.workforce.entity.VacationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VacationRequestRepository extends JpaRepository<VacationRequest, UUID> {
    List<VacationRequest> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);
    List<VacationRequest> findByStatusOrderByCreatedAtAsc(VacationRequest.VacationStatus status);
}
