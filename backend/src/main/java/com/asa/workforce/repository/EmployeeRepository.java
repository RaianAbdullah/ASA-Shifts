package com.asa.workforce.repository;

import com.asa.workforce.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    boolean existsByNationalId(String nationalId);
    Optional<Employee> findByNationalId(String nationalId);
    boolean existsByPhoneNumber(String phoneNumber);
}
