package io.github.goraebap.bit.shared.web;

import java.io.IOException;
import java.time.Duration;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serves the built screens from app.screens (the image sets file:/app/screens/; the default is static/ on the class
 * path, which tests fill). The app routes its own addresses in the browser, so any address outside /api/ that is not a
 * file gets index.html. An address that names a file (its last segment has an extension, /favicon.ico) is never one
 * of the app's, so a missing one stays 404 instead of answering with the page. Without built screens (development)
 * nothing here answers and those addresses are 404.
 */
@Configuration
class ScreenConfig implements WebMvcConfigurer {
    /** A last path segment ending in a dot and letters or digits, as a file's name does; the app's own ids never do. */
    private static final Pattern FILE_NAME = Pattern.compile("\\.[A-Za-z0-9]+$");

    private final String screens;

    ScreenConfig(@Value("${app.screens:classpath:/static/}") String screens) {
        this.screens = screens.endsWith("/") ? screens : screens + "/";
    }

    /** The resource handler never answers an empty path, so the root goes to the page itself. */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Built files carry their content hash in the name, so they never change.
        registry.addResourceHandler("/assets/**")
                .addResourceLocations(screens + "assets/")
                .setCacheControl(
                        CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
        // The page and the service worker are read again each time, so a new release reaches everyone.
        registry.addResourceHandler("/**")
                .addResourceLocations(screens)
                .setCacheControl(CacheControl.noCache())
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String path, Resource location) throws IOException {
                        Resource file = super.getResource(path, location);
                        if (file != null || path.equals("api") || path.startsWith("api/")) return file;
                        if (FILE_NAME.matcher(path).find()) return null;
                        return super.getResource("index.html", location);
                    }
                });
    }
}
