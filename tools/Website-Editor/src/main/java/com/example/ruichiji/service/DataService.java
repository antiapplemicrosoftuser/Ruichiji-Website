package com.example.ruichiji.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Simple JSON-backed data service.
 * Uses current working directory as project root (no folder chooser).
 * Data files are written to <cwd>/data/<kind>.json
 * Images are stored under <cwd>/assets/images/
 */
public class DataService {
    private final Path projectRoot;
    private final Path dataDir;
    private final Path imagesDir;
    private final ObjectMapper mapper = new ObjectMapper();

    public DataService() throws IOException {
        this.projectRoot = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
        this.dataDir = projectRoot.resolve("data");
        this.imagesDir = projectRoot.resolve("assets").resolve("images");
        Files.createDirectories(dataDir);
        Files.createDirectories(imagesDir);
    }

    public List<ObjectNode> readList(String kind) throws IOException {
        Path p = dataDir.resolve(kind + ".json");
        if (!Files.exists(p)) return new ArrayList<>();
        var node = mapper.readTree(p.toFile());
        List<ObjectNode> out = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (var e : node) {
                if (e.isObject()) out.add((ObjectNode) e);
            }
        }
        return out;
    }

    public void writeList(String kind, List<ObjectNode> list) throws IOException {
        Path p = dataDir.resolve(kind + ".json");
        ArrayNode arr = mapper.createArrayNode();
        for (var n : list) arr.add(n);
        mapper.writerWithDefaultPrettyPrinter().writeValue(p.toFile(), arr);
    }

    /**
     * Copy image into assets/images and return the relative path to assets/images/<filename>
     */
    public Path importImage(File src) throws IOException {
        if (src == null) throw new IllegalArgumentException("src is null");
        String fileName = src.getName();
        Path dest = imagesDir.resolve(fileName);
        // if exists, try to avoid overwrite by appending a counter
        int i = 1;
        String base = fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
        String ext = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf('.')) : "";
        while (Files.exists(dest)) {
            dest = imagesDir.resolve(base + "-" + i + ext);
            i++;
        }
        Files.copy(src.toPath(), dest, StandardCopyOption.REPLACE_EXISTING);
        return projectRoot.relativize(dest);
    }
}