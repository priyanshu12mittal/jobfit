package com.jobfit.orchestrator;

import com.jobfit.orchestrator.dto.AnalyzeResponse;
import com.jobfit.orchestrator.dto.ApplicationResponse;
import com.jobfit.orchestrator.dto.CreateApplicationRequest;
import com.jobfit.orchestrator.dto.UpdateApplicationRequest;
import com.jobfit.orchestrator.service.AnalyzeService;
import com.jobfit.orchestrator.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService service;
    private final AnalyzeService analyzeService;

    public ApplicationController(ApplicationService service, AnalyzeService analyzeService) {
        this.service = service;
        this.analyzeService = analyzeService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationResponse create(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody CreateApplicationRequest request
    ) {
        return ApplicationResponse.from(service.create(userId, request));
    }

    @GetMapping
    public List<ApplicationResponse> list(@RequestHeader("X-User-Id") Long userId) {
        return service.listByUser(userId).stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public ApplicationResponse get(@PathVariable Long id) {
        return ApplicationResponse.from(service.getById(id));
    }

    @PatchMapping("/{id}")
    public ApplicationResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateApplicationRequest request
    ) {
        return ApplicationResponse.from(service.update(id, request));
    }

    @PostMapping("/{id}/analyze")
    public AnalyzeResponse analyze(@PathVariable Long id) {
        return analyzeService.analyzeApplication(id);
    }
}
