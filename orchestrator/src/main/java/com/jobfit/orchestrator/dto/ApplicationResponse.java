package com.jobfit.orchestrator.dto;

import com.jobfit.orchestrator.entity.Application;

import java.time.Instant;

public record ApplicationResponse(
        Long id,
        String company,
        String role,
        String status,
        Integer fitScore,
        String analysisJson,
        Instant createdAt,
        Instant updatedAt
) {
    public static ApplicationResponse from(Application app) {
        return new ApplicationResponse(
                app.getId(),
                app.getCompany(),
                app.getRole(),
                app.getStatus(),
                app.getFitScore(),
                app.getAnalysisJson(),
                app.getCreatedAt(),
                app.getUpdatedAt()
        );
    }
}
