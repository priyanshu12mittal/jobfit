package com.jobfit.orchestrator.dto;

import java.util.List;

public record EmbedResponse(List<List<Float>> embeddings) {}
