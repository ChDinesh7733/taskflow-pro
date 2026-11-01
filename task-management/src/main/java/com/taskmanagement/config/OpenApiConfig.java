package com.taskmanagement.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI 3.0 configuration for Swagger UI.
 *
 * Access at: http://localhost:8080/swagger-ui.html
 * Raw JSON:  http://localhost:8080/v3/api-docs
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI taskManagementOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Task Management System API")
                        .description(
                                "RESTful API for managing tasks with automatic status transitions.\n\n" +
                                "**Status Flow:**\n" +
                                "`PENDING` → *(auto after delay)* → `IN_PROGRESS` → *(auto after delay)* → `COMPLETED`\n\n" +
                                "Status transitions are handled automatically by a background scheduler — " +
                                "clients do not need to update status manually."
                        )
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Task Management System")
                                .email("admin@taskmanagement.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Development Server")
                ));
    }
}
