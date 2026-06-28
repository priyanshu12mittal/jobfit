package com.jobfit.orchestrator.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobfit.orchestrator.dto.AnalyzeResponse;
import com.jobfit.orchestrator.dto.EmbedRequest;
import com.jobfit.orchestrator.dto.EmbedResponse;
import com.jobfit.orchestrator.entity.Application;
import com.jobfit.orchestrator.entity.ResumeChunk;
import com.jobfit.orchestrator.repository.ApplicationRepository;
import com.jobfit.orchestrator.repository.ResumeChunkRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyzeService {

    private final RestClient restClient;
    private final ApplicationRepository applicationRepo;
    private final ResumeChunkRepository resumeChunkRepo;
    private final ObjectMapper objectMapper;

    public AnalyzeService(
            @Value("${ai-service.base-url}") String aiServiceBaseUrl,
            ApplicationRepository applicationRepo,
            ResumeChunkRepository resumeChunkRepo,
            ObjectMapper objectMapper
    ) {
        var httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .baseUrl(aiServiceBaseUrl)
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .build();
        this.applicationRepo = applicationRepo;
        this.resumeChunkRepo = resumeChunkRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AnalyzeResponse analyzeApplication(Long applicationId) {
        Application app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));

        if (app.getResumeText() == null || app.getJdText() == null) {
            throw new IllegalArgumentException("Resume text and JD text are required for analysis");
        }

        // 1. Embed the JD text to find relevant resume chunks
        EmbedResponse embedResponse = restClient.post()
                .uri("/embed")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new EmbedRequest(List.of(app.getJdText())))
                .retrieve()
                .body(EmbedResponse.class);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("jd_text", app.getJdText());

        if (embedResponse != null && embedResponse.embeddings() != null && !embedResponse.embeddings().isEmpty()) {
            List<Float> jdVector = embedResponse.embeddings().get(0);
            String vectorString = jdVector.toString(); // Results in "[0.1, 0.2, ...]" format
            
            // 2. Fetch top 5 relevant resume chunks using pgvector
            List<ResumeChunk> topChunks = resumeChunkRepo.findTopKSimilar(app.getUser().getId(), vectorString, 5);
            List<String> chunkTexts = topChunks.stream().map(ResumeChunk::getContent).toList();
            
            requestBody.put("relevant_chunks", chunkTexts);
        }

        // 3. Send to AI Service
        AnalyzeResponse response;
        try {
            response = restClient.post()
                    .uri("/analyze")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(AnalyzeResponse.class);
        } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "Too many requests to the AI service. Please wait a minute and try again.");
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            if (e.getStatusCode().value() == 429) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "Too many requests to the AI service. Please wait a minute and try again.");
            }
            throw e;
        }

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
