package com.stylebook.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${stylebook.upload.dir}")
    private String uploadDir;

    /**
     * Serves uploaded images.
     *
     * <p>Two locations, checked in order. The first is wherever uploads are currently
     * written, which in production should be a mounted volume — a container filesystem is
     * wiped on every redeploy, so anything written to the image itself disappears. The
     * second is the demo images baked into the image at build time, which stay reachable
     * even after the upload directory is repointed at a volume.
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir, "file:./uploads/");
    }
}