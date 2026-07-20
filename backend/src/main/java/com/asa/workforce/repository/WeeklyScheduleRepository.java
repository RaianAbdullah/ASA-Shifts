package com.asa.workforce.repository;

import com.asa.workforce.entity.WeeklySchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WeeklyScheduleRepository extends JpaRepository<WeeklySchedule, UUID> {
    List<WeeklySchedule> findByEmployeeIdOrderByWeekStartDesc(UUID employeeId);
    Optional<WeeklySchedule> findByEmployeeIdAndWeekStart(UUID employeeId, LocalDate weekStart);
}
