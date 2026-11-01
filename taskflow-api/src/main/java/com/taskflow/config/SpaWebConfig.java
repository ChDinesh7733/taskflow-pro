package com.taskflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) throws IOException {
                    Resource requestedResource = location.createRelative(resourcePath);
                    // If the specific requested file exists and is readable, serve it (e.g. assets, favicon)
                    if (requestedResource.exists() && requestedResource.isReadable()) {
                        return requestedResource;
                    }
                    // Do not forward backend routes (/api, /ws, /swagger-ui, /v3)
                    if (resourcePath.startsWith("api") || resourcePath.startsWith("ws") 
                            || resourcePath.startsWith("swagger-ui") || resourcePath.startsWith("v3")) {
                        return null;
                    }
                    // For all other client-side routes, serve index.html
                    return new ClassPathResource("/static/index.html");
                }
            });
    }
}
