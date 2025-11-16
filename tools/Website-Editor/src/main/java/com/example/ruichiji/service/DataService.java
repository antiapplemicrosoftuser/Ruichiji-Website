package com.example.ruichiji.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;

/**
 * JSON-backed data service.
 *
 * Behavior change: prefer and use the repository-root assets/data and assets/images directories.
 * Starting from the current working directory (user.dir), walk upwards looking for an "assets/data"
 * folder. The first found "assets/data" is used as the dataDir; images go to the corresponding
 * assets/images under that repo root.
 *
 * Reading:
 * - Supports either:
 *   - top-level array: [ {...}, {...} ]
 *   - object with "items" array: { "items": [ {...}, {...} ] }
 *
 * Writing:
 * - Writes object form { "items": [ ... ] } to preserve repository format.
 *
 * BOM removal and a lenient repair attempt are included for common corruptions.
 */
public class DataService {
    private final Path execRoot;     // current working dir (where app was started)
    private final Path repoRoot;     // detected repository root (parent of assets/)
    private final Path dataDir;      // resolved assets/data (preferred)
    private final Path imagesDir;    // resolved assets/images (preferred)
    private final ObjectMapper mapper = new ObjectMapper();

    public DataService() throws IOException {
        this.execRoot = Paths.get(System.getProperty("user.dir")).toAbsolutePath();

        Path foundAssetsData = findAssetsDataUpwards(execRoot);
        if (foundAssetsData != null) {
            // compute values into local variables to avoid assigning final fields multiple times
            Path dataDirCandidate = foundAssetsData.toAbsolutePath(); // .../assets/data
            Path assetsDir = dataDirCandidate.getParent(); // .../assets
            Path repoRootCandidate = assetsDir != null && assetsDir.getParent() != null
                    ? assetsDir.getParent().toAbsolutePath() // parent of assets -> repo root
                    : assetsDir != null ? assetsDir.toAbsolutePath() : execRoot;

            Path imagesDirCandidate = repoRootCandidate.resolve("assets").resolve("images");

            // Now assign final fields exactly once
            this.repoRoot = repoRootCandidate;
            this.dataDir = dataDirCandidate;
            this.imagesDir = imagesDirCandidate;
        } else {
            // fallback: use local data and images under execRoot
            this.repoRoot = execRoot;
            this.dataDir = execRoot.resolve("data");
            this.imagesDir = execRoot.resolve("assets").resolve("images");
        }

        // Ensure directories exist (create if missing)
        Files.createDirectories(this.dataDir);
        Files.createDirectories(this.imagesDir);
    }

    /**
     * Walk upward from start and return path to assets/data if found, otherwise null.
     */
    private Path findAssetsDataUpwards(Path start) {
        Path cur = start;
        while (cur != null) {
            Path candidate = cur.resolve("assets").resolve("data");
            if (Files.exists(candidate) && Files.isDirectory(candidate)) {
                return candidate.toAbsolutePath();
            }
            cur = cur.getParent();
        }
        return null;
    }

    private byte[] stripUtf8Bom(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xEF && (b[1] & 0xFF) == 0xBB && (b[2] & 0xFF) == 0xBF) {
            byte[] nb = new byte[b.length - 3];
            System.arraycopy(b, 3, nb, 0, nb.length);
            return nb;
        }
        return b;
    }

    private JsonNode tryParse(String text) {
        try {
            return mapper.readTree(text);
        } catch (Exception ex) {
            return null;
        }
    }

    private String lenientRepair(String text) {
        if (text == null) return null;
        String t = text.trim();

        // Extract from first [ to last ] if possible
        int firstBracket = t.indexOf('[');
        int lastBracket = t.lastIndexOf(']');
        if (firstBracket >= 0 && lastBracket > firstBracket) {
            t = t.substring(firstBracket, lastBracket + 1);
        }

        if (!t.endsWith("]")) {
            t = t + "]";
        }

        long quoteCount = t.chars().filter(ch -> ch == '"').count();
        if ((quoteCount % 2) == 1) {
            int lastCloseBrace = t.lastIndexOf('}');
            int insertPos = lastCloseBrace >= 0 ? lastCloseBrace : t.lastIndexOf(']');
            if (insertPos <= 0) insertPos = t.length() - 1;
            t = t.substring(0, insertPos) + "\"" + t.substring(insertPos);
        }
        return t;
    }

    /**
     * Read list for given kind. Data files are expected under dataDir/<kind>.json
     * Supports both top-level array and { "items": [...] } formats.
     */
    public List<ObjectNode> readList(String kind) throws IOException {
        Path p = dataDir.resolve(kind + ".json");
        if (!Files.exists(p)) return new ArrayList<>();

        try {
            JsonNode root = mapper.readTree(p.toFile());
            JsonNode arrNode = extractItemsArray(root);
            List<ObjectNode> out = new ArrayList<>();
            if (arrNode != null && arrNode.isArray()) {
                for (var elem : arrNode) {
                    if (elem.isObject()) out.add((ObjectNode) elem);
                }
            }
            return out;
        } catch (IOException ioe) {
            // attempt lenient repair: read raw, try to repair and parse
            try {
                String raw = Files.readString(p, StandardCharsets.UTF_8);
                raw = new String(stripUtf8Bom(raw.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
                String repaired = lenientRepair(raw);
                JsonNode repairedRoot = tryParse(repaired);
                JsonNode arrNode = extractItemsArray(repairedRoot);
                if (arrNode != null && arrNode.isArray()) {
                    // overwrite file with repaired canonical form (object with items array)
                    ObjectNode outRoot = mapper.createObjectNode();
                    outRoot.set("items", mapper.valueToTree(arrNode));
                    Files.writeString(p, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(outRoot), StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
                    List<ObjectNode> res = new ArrayList<>();
                    for (var elem : arrNode) if (elem.isObject()) res.add((ObjectNode) elem);
                    return res;
                }
            } catch (Exception ex) {
                // fallthrough to throw original
            }
            throw ioe;
        }
    }

    private JsonNode extractItemsArray(JsonNode root) {
        if (root == null) return null;
        if (root.isArray()) return root;
        if (root.isObject() && root.has("items") && root.get("items").isArray()) return root.get("items");
        return null;
    }

    /**
     * Write list for given kind. Writes object { "items": [ ... ] } to dataDir/<kind>.json
     */
    public void writeList(String kind, List<ObjectNode> list) throws IOException {
        Path p = dataDir.resolve(kind + ".json");
        ArrayNode arr = mapper.createArrayNode();
        for (var n : list) arr.add(n);
        ObjectNode root = mapper.createObjectNode();
        root.set("items", arr);
        mapper.writerWithDefaultPrettyPrinter().writeValue(p.toFile(), root);
    }

    /**
     * Copy image into the repo assets/images directory and return the path relative to repo root.
     * If repoRoot is not set, returns a path relative to execRoot.
     */
    public Path importImage(File src) throws IOException {
        if (src == null) throw new IllegalArgumentException("src is null");
        String fileName = src.getName();
        Path dest = imagesDir.resolve(fileName);
        int i = 1;
        String base = fileName.contains(".") ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
        String ext = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf('.')) : "";
        while (Files.exists(dest)) {
            dest = imagesDir.resolve(base + "-" + i + ext);
            i++;
        }
        Files.copy(src.toPath(), dest, StandardCopyOption.REPLACE_EXISTING);
        // return path relative to repoRoot if possible; otherwise relative to execRoot
        Path baseForRel = (repoRoot != null) ? repoRoot : execRoot;
        try {
            return baseForRel.relativize(dest);
        } catch (Exception ex) {
            return dest;
        }
    }

    // Expose for debugging
    public Path getExecRoot() { return execRoot; }
    public Path getRepoRoot() { return repoRoot; }
    public Path getDataDir() { return dataDir; }
    public Path getImagesDir() { return imagesDir; }
}