package com.jobfit.orchestrator.service;

import com.jobfit.orchestrator.dto.EmbedRequest;
import com.jobfit.orchestrator.dto.EmbedResponse;
import com.jobfit.orchestrator.entity.AppUser;
import com.jobfit.orchestrator.entity.ResumeChunk;
import com.jobfit.orchestrator.repository.AppUserRepository;
import com.jobfit.orchestrator.repository.ResumeChunkRepository;
import com.pgvector.PGvector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class ResumeVectorService {

    private static final Logger log = LoggerFactory.getLogger(ResumeVectorService.class);

    private final ResumeChunkRepository chunkRepository;
    private final AppUserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${ai-service.base-url}")
    private String aiServiceUrl;

    public ResumeVectorService(ResumeChunkRepository chunkRepository, AppUserRepository userRepository) {
        this.chunkRepository = chunkRepository;
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
    }

    @Async
    @Transactional
    public void embedAndStoreResume(Long userId, String resumeText) {
        if (resumeText == null || resumeText.isBlank()) return;

        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // 1. Delete existing chunks for this user so we always have the latest resume
        chunkRepository.deleteByUserId(userId);

        // 2. Chunking Logic (Split by newline/bullet points)
        List<String> chunks = chunkText(resumeText);
        if (chunks.isEmpty()) return;

        log.info("Chunked resume for user {} into {} pieces", userId, chunks.size());

        // 3. Call AI Service /embed
        String url = aiServiceUrl + "/embed";
        EmbedRequest request = new EmbedRequest(chunks);

        try {
            EmbedResponse response = restTemplate.postForObject(url, request, EmbedResponse.class);
            if (response != null && response.embeddings() != null && response.embeddings().size() == chunks.size()) {
                // 4. Save to DB
                List<ResumeChunk> entities = new ArrayList<>();
                for (int i = 0; i < chunks.size(); i++) {
                    ResumeChunk chunk = new ResumeChunk();
                    chunk.setUser(user);
                    chunk.setContent(chunks.get(i));
                    chunk.setEmbedding(new PGvector(toFloatArray(response.embeddings().get(i))));
                    entities.add(chunk);
                }
                chunkRepository.saveAll(entities);
                log.info("Successfully saved {} embeddings for user {}", entities.size(), userId);
            } else {
                log.error("Invalid response from AI service embedding endpoint.");
            }
        } catch (Exception e) {
            log.error("Failed to call AI embedding service", e);
        }
    }

    private List<String> chunkText(String text) {
        List<String> result = new ArrayList<>();
        // Split by newline or bullet points
        String[] lines = text.split("\\n");
        StringBuilder currentChunk = new StringBuilder();

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            // If it looks like a bullet point or a new section header
            if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•") || 
                (trimmed.length() < 40 && trimmed.endsWith(":"))) {
                // Start a new chunk if we already have some text
                if (!currentChunk.isEmpty()) {
                    result.add(currentChunk.toString().trim());
                    currentChunk.setLength(0); // Clear
                }
            }

            currentChunk.append(trimmed).append(" ");

            // Max chunk size guard (approx 500 chars)
            if (currentChunk.length() > 500) {
                result.add(currentChunk.toString().trim());
                currentChunk.setLength(0);
            }
        }

        if (!currentChunk.isEmpty()) {
            result.add(currentChunk.toString().trim());
        }

        return result;
    }

    private float[] toFloatArray(List<Float> list) {
        float[] arr = new float[list.size()];
        for (int i = 0; i < list.size(); i++) {
            arr[i] = list.get(i) != null ? list.get(i) : 0.0f;
        }
        return arr;
    }
}
