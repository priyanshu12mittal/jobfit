package com.jobfit.orchestrator.service;

import com.jobfit.orchestrator.dto.CreateApplicationRequest;
import com.jobfit.orchestrator.dto.UpdateApplicationRequest;
import com.jobfit.orchestrator.entity.AppUser;
import com.jobfit.orchestrator.entity.Application;
import com.jobfit.orchestrator.repository.AppUserRepository;
import com.jobfit.orchestrator.repository.ApplicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final AppUserRepository userRepository;
    private final ResumeVectorService resumeVectorService;

    public ApplicationService(ApplicationRepository applicationRepository, AppUserRepository userRepository, ResumeVectorService resumeVectorService) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.resumeVectorService = resumeVectorService;
    }

    @Transactional
    public Application create(Long userId, CreateApplicationRequest req) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Application app = new Application();
        app.setUser(user);
        app.setCompany(req.company());
        app.setRole(req.role());
        app.setStatus(req.status());
        app.setResumeText(req.resumeText());
        app.setJdText(req.jdText());

        Application saved = applicationRepository.save(app);

        // Trigger background embedding of the resume if provided
        if (req.resumeText() != null && !req.resumeText().isBlank()) {
            resumeVectorService.embedAndStoreResume(user.getId(), req.resumeText());
        }

        return saved;
    }

    public List<Application> listByUser(Long userId) {
        return applicationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Application getById(Long id, Long userId) {
        return applicationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + id));
    }

    @Transactional
    public Application update(Long id,Long userId, UpdateApplicationRequest req) {
        Application app = getById(id, userId);

        if (req.company() != null) app.setCompany(req.company());
        if (req.role() != null) app.setRole(req.role());
        if (req.status() != null) app.setStatus(req.status());
        if (req.jdText() != null) app.setJdText(req.jdText());
        if (req.resumeText() != null) {
            app.setResumeText(req.resumeText());
            // Update vectors if resume changes
            resumeVectorService.embedAndStoreResume(app.getUser().getId(), req.resumeText());
        }

        return applicationRepository.save(app);
    }
}
