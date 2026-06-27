package com.jobfit.orchestrator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AnalyzeRequest(
        @JsonProperty("resume_text") String resumeText,
        @JsonProperty("jd_text") String jdText
) {}
