package com.jobfit.orchestrator.repository;

import com.jobfit.orchestrator.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Application> findByIdAndUserId(Long id, Long userId);
}
