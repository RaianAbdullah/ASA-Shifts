package com.asa.workforce.repository;

import com.asa.workforce.entity.VacationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VacationRequestRepository extends JpaRepository<VacationRequest, UUID> {

    List<VacationRequest> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    /** All requests for a given status, oldest-first (used for pending queues) */
    List<VacationRequest> findByStatusOrderByCreatedAtAsc(VacationRequest.VacationStatus status);

    /** Stage-1 pending requests scoped to a single department */
    List<VacationRequest> findByStatusAndEmployeeDepartmentIdOrderByCreatedAtAsc(
            VacationRequest.VacationStatus status, UUID departmentId);
}
