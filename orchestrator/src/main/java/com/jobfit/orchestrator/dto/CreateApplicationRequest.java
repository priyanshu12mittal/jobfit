package com.jobfit.orchestrator.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateApplicationRequest(
        @NotBlank String company,
        @NotBlank String role,
        String status,
        String resumeText,
        String jdText
) {
    public CreateApplicationRequest {
        if (status == null || status.isBlank()) {
            status = "SAVED";
        }
    }
}
