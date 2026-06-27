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

    private final ApplicationRepository applicationRepo;
    private final AppUserRepository userRepo;

    public ApplicationService(ApplicationRepository applicationRepo, AppUserRepository userRepo) {
        this.applicationRepo = applicationRepo;
        this.userRepo = userRepo;
    }

    @Transactional
    public Application create(Long userId, CreateApplicationRequest req) {
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Application app = new Application();
        app.setUser(user);
        app.setCompany(req.company());
        app.setRole(req.role());
        app.setStatus(req.status());
        app.setResumeText(req.resumeText());
        app.setJdText(req.jdText());

        return applicationRepo.save(app);
    }

    public List<Application> listByUser(Long userId) {
        return applicationRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Application getById(Long id) {
        return applicationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + id));
    }

    @Transactional
    public Application update(Long id, UpdateApplicationRequest req) {
        Application app = getById(id);

        if (req.company() != null) app.setCompany(req.company());
        if (req.role() != null) app.setRole(req.role());
        if (req.status() != null) app.setStatus(req.status());
        if (req.resumeText() != null) app.setResumeText(req.resumeText());
        if (req.jdText() != null) app.setJdText(req.jdText());

        return applicationRepo.save(app);
    }
}
