package com.jobfit.orchestrator.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateApplicationRequest(
        @NotBlank String company,
        @NotBlank String role,
        String status,
        @jakarta.validation.constraints.Size(max = 15000, message = "Resume text is too large (max 15000 characters)") String resumeText,
        @jakarta.validation.constraints.Size(max = 15000, message = "JD text is too large (max 15000 characters)") String jdText
) {
    public CreateApplicationRequest {
        if (status == null || status.isBlank()) {
            status = "SAVED";
        }
    }
}
