package com.taskflow.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecuritySchemes;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "TaskFlow Pro SaaS Platform API",
        version = "1.0.0",
        description = "Comprehensive production REST API for TaskFlow: NLP task creation, AI planner, 2-way Google Calendar sync, webhooks, team collaboration, bulk actions, and multi-tier billing.",
        contact = @Contact(
            name = "TaskFlow Platform Engineering",
            email = "support@taskflow.dev",
            url = "https://taskflow.dev"
        ),
        license = @License(
            name = "MIT License",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    servers = {
        @Server(url = "http://localhost:8081", description = "Local Unified Application Server"),
        @Server(url = "https://api.taskflow.dev", description = "Production Cloud Gateway")
    },
    tags = {
        @Tag(name = "Auth", description = "Authentication, registration, JWT sessions, and demo accounts"),
        @Tag(name = "Tasks", description = "Task CRUD, status lifecycles, and bulk batch actions"),
        @Tag(name = "Categories", description = "Project categorization and color tagging"),
        @Tag(name = "Productivity", description = "Pomodoro focus timer, habit tracking, OKRs, and time blocking"),
        @Tag(name = "Gamification", description = "XP awards, user levels, streaks, and achievement badges"),
        @Tag(name = "Collaboration", description = "Team member invitations, role controls, presence, and public share links"),
        @Tag(name = "Integrations", description = "Google Calendar sync, inbound email forwarders, outbound webhooks, and API keys"),
        @Tag(name = "Billing", description = "SaaS subscription management, checkout simulation, and data export"),
        @Tag(name = "Admin", description = "Workspace user management, telemetry metrics, and system administration")
    }
)
@SecuritySchemes({
    @SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Standard JWT Bearer token obtained from POST /api/auth/login or /api/auth/demo"
    ),
    @SecurityScheme(
        name = "apiKeyAuth",
        type = SecuritySchemeType.APIKEY,
        in = SecuritySchemeIn.HEADER,
        paramName = "X-TaskFlow-API-Key",
        description = "Personal developer API Key (tf_live_...) for server-to-server or extension requests"
    )
})
public class OpenApiConfig {}
