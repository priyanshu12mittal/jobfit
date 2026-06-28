package com.jobfit.orchestrator.dto;

public record UpdateApplicationRequest(
        String company,
        String role,
        String status,
        @jakarta.validation.constraints.Size(max = 15000, message = "Resume text is too large (max 15000 characters)") String resumeText,
        @jakarta.validation.constraints.Size(max = 15000, message = "JD text is too large (max 15000 characters)") String jdText
) {}
