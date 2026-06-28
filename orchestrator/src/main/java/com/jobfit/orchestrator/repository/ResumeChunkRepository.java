package com.jobfit.orchestrator.repository;

import com.jobfit.orchestrator.entity.ResumeChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResumeChunkRepository extends JpaRepository<ResumeChunk, Long> {
    List<ResumeChunk> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
