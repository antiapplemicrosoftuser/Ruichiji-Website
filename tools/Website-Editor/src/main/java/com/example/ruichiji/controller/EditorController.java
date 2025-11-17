package com.example.ruichiji.controller;

import com.example.ruichiji.service.DataService;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import javafx.stage.Window;

import java.io.IOException;
import java.util.List;

/**
 * Simple editor controller that supports different JSON schemas.
 * It maps the "body" field to either "description" (default) or "content" for topics.
 * Also updates the UI label to "Content" when editing topics.
 */
public class EditorController {

    @FXML private TextField tfId;
    @FXML private TextField tfTitle;
    @FXML private TextField tfDate;
    @FXML private TextField tfCover;
    @FXML private TextArea taDescription; // shown as "Description" in UI, may map to "content" for topics
    @FXML private TextArea taLyrics;
    @FXML private WebView wvPreview;
    @FXML private TextArea taRawJson;
    @FXML private Label lblDescription; // new: label to switch text to "Content" for topics

    private DataService dataService;
    private String kind;
    private ObjectNode current;
    private boolean isNew;
    private final ObjectMapper mapper = new ObjectMapper();

    // Which JSON key to use for the "description" textarea
    // default: "description"; for topics: "content"
    private String contentKey = "description";

    public void setDataService(DataService ds) {
        this.dataService = ds;
    }

    public void setKind(String kind) {
        this.kind = kind;
        if ("topics".equals(kind)) {
            this.contentKey = "content";
            if (lblDescription != null) lblDescription.setText("Content:");
        } else {
            this.contentKey = "description";
            if (lblDescription != null) lblDescription.setText("Description:");
        }
    }

    /**
     * node may be null for new item
     */
    public void setItem(ObjectNode node, boolean isNew) {
        this.current = node;
        this.isNew = isNew;
        populateFields();
    }

    private void populateFields() {
        if (lblDescription != null) {
            // ensure label matches kind even if populateFields called after setKind
            if ("topics".equals(kind)) lblDescription.setText("Content:");
            else lblDescription.setText("Description:");
        }

        if (current == null) {
            tfId.setText("");
            tfTitle.setText("");
            tfDate.setText("");
            tfCover.setText("");
            taDescription.setText("");
            taLyrics.setText("");
            taRawJson.setText("");
            tfId.setEditable(true); // new item -> allow editing id
            return;
        }
        tfId.setText(getText(current, "id"));
        tfTitle.setText(getText(current, "title"));
        tfDate.setText(getText(current, "date"));
        tfCover.setText(getText(current, "cover"));

        // Prefer the mapped contentKey (e.g. "content" for topics). If absent, fallback to "description".
        String body = getText(current, contentKey);
        if (body.isEmpty() && !"description".equals(contentKey)) {
            body = getText(current, "description");
        }
        taDescription.setText(body);

        // lyrics may not exist for topics, but fill if present
        taLyrics.setText(getText(current, "lyrics"));

        try {
            taRawJson.setText(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(current));
        } catch (Exception ex) {
            taRawJson.setText(current.toString());
        }

        // If editing an existing item, prevent changing the id to avoid accidental id changes.
        tfId.setEditable(isNew);
    }

    @FXML
    private void onSave() {
        if (dataService == null || kind == null) {
            showAlert("設定エラー", "DataService または kind が設定されていません。");
            return;
        }
        try {
            // Load list
            List<ObjectNode> list = dataService.readList(kind);

            // Ensure current node exists
            ObjectNode node = current;
            if (node == null) {
                node = mapper.createObjectNode();
            }

            node.put("id", tfId.getText() == null ? "" : tfId.getText());
            node.put("title", tfTitle.getText() == null ? "" : tfTitle.getText());
            node.put("date", tfDate.getText() == null ? "" : tfDate.getText());
            node.put("cover", tfCover.getText() == null ? "" : tfCover.getText());

            // write body to the mapped key
            node.put(contentKey, taDescription.getText() == null ? "" : taDescription.getText());

            // optional: keep description too for non-topics, or keep both
            if (!"content".equals(contentKey)) {
                node.put("description", taDescription.getText() == null ? "" : taDescription.getText());
            }

            // lyrics/raw json handling (if applicable)
            if (taLyrics.getText() != null && !taLyrics.getText().isBlank()) {
                node.put("lyrics", taLyrics.getText());
            }

            // Update or insert
            boolean replaced = false;
            for (int i = 0; i < list.size(); i++) {
                JsonNode e = list.get(i);
                String id = getText((ObjectNode) e, "id");
                if (id.equals(node.get("id").asText())) {
                    list.set(i, node);
                    replaced = true;
                    break;
                }
            }
            if (!replaced) {
                // prepend new items
                list.add(0, node);
            }

            dataService.writeList(kind, list);

            // Close window
            Window w = tfId.getScene().getWindow();
            if (w instanceof Stage) ((Stage) w).close();
        } catch (IOException ex) {
            ex.printStackTrace();
            showAlert("保存エラー", ex.getMessage());
        }
    }

    @FXML
    private void onCancel() {
        Window w = tfId.getScene().getWindow();
        if (w instanceof Stage) ((Stage) w).close();
    }

    @FXML
    private void onChooseCover() {
        // keep simple: user can paste a URL / path in tfCover; actual file chooser logic can be added if needed
        showAlert("未実装", "カバー選択は未実装です。URLを直接入力してください。");
    }

    private static String getText(ObjectNode n, String key) {
        if (n == null || !n.has(key)) return "";
        JsonNode node = n.get(key);
        return node == null || node.isNull() ? "" : node.asText("");
    }

    private void showAlert(String title, String msg) {
        Alert a = new Alert(Alert.AlertType.ERROR, msg, ButtonType.OK);
        a.setTitle(title);
        a.showAndWait();
    }
}