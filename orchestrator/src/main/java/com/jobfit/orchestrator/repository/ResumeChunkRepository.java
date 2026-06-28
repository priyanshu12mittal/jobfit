package com.jobfit.orchestrator.repository;

import com.jobfit.orchestrator.entity.ResumeChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResumeChunkRepository extends JpaRepository<ResumeChunk, Long> {
    List<ResumeChunk> findByUserId(Long userId);
    void deleteByUserId(Long userId);

    @Query(value = "SELECT * FROM resume_chunks WHERE user_id = :userId ORDER BY embedding <=> CAST(:vector AS vector) LIMIT :k", nativeQuery = true)
    List<ResumeChunk> findTopKSimilar(@Param("userId") Long userId, @Param("vector") String vectorString, @Param("k") int k);
}
