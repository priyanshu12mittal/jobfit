package com.jobfit.orchestrator.dto;

public record UpdateApplicationRequest(
        String company,
        String role,
        String status,
        String resumeText,
        String jdText
) {}
