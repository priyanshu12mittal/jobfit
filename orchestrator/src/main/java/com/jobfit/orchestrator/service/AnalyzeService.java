package com.jobfit.orchestrator.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobfit.orchestrator.dto.AnalyzeRequest;
import com.jobfit.orchestrator.dto.AnalyzeResponse;
import com.jobfit.orchestrator.entity.Application;
import com.jobfit.orchestrator.repository.ApplicationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class AnalyzeService {

    private final RestClient restClient;
    private final ApplicationRepository applicationRepo;
    private final ObjectMapper objectMapper;

    public AnalyzeService(
            @Value("${ai-service.base-url}") String aiServiceBaseUrl,
            ApplicationRepository applicationRepo,
            ObjectMapper objectMapper
    ) {
        this.restClient = RestClient.builder().baseUrl(aiServiceBaseUrl).build();
        this.applicationRepo = applicationRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AnalyzeResponse analyzeApplication(Long applicationId) {
        Application app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));

        if (app.getResumeText() == null || app.getJdText() == null) {
            throw new IllegalArgumentException("Resume text and JD text are required for analysis");
        }

        AnalyzeResponse response = restClient.post()
                .uri("/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new AnalyzeRequest(app.getResumeText(), app.getJdText()))
                .retrieve()
                .body(AnalyzeResponse.class);

        app.setFitScore(response.fitScore());
        try {
            app.setAnalysisJson(objectMapper.writeValueAsString(response));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize analysis response", e);
        }
        applicationRepo.save(app);

        return response;
    }
}
