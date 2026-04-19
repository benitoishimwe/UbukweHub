package com.prani.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${prani.public-dir:./public}")
    private String publicDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absolutePublicDir = Paths.get(publicDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/public/**")
            .addResourceLocations(absolutePublicDir);
    }
}
