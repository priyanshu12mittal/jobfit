package com.jobfit.orchestrator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AnalyzeResponse(
        @JsonProperty("fit_score") int fitScore,
        List<String> strengths,
        List<String> gaps,
        @JsonProperty("suggested_bullets") List<String> suggestedBullets
) {}
