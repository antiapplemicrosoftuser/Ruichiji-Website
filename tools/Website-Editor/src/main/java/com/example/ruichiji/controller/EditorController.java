package com.example.ruichiji.controller;

import com.example.ruichiji.service.DataService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.web.WebView;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.File;
import java.io.IOException;
import java.util.List;

public class EditorController {
    @FXML private TextField tfId;
    @FXML private TextField tfTitle;
    @FXML private TextField tfDate;
    @FXML private TextField tfCover;
    @FXML private TextArea taDescription;
    @FXML private TextArea taLyrics;
    @FXML private WebView wvPreview;
    @FXML private TextArea taRawJson;

    private DataService dataService;
    private String kind;
    private ObjectNode item;
    private boolean isNew;

    private final Parser mdParser = Parser.builder().build();
    private final HtmlRenderer mdRenderer = HtmlRenderer.builder().build();
    private final ObjectMapper mapper = new ObjectMapper();

    public void setDataService(DataService ds) {
        this.dataService = ds;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public void setItem(ObjectNode node, boolean isNew) {
        this.isNew = isNew;
        if (isNew || node == null) {
            this.item = mapper.createObjectNode();
            tfId.setDisable(false);
            tfId.setText("");
            tfTitle.setText("");
            tfDate.setText("");
            tfCover.setText("");
            taDescription.setText("");
            taLyrics.setText("");
            taRawJson.setText("{}");
        } else {
            this.item = node;
            tfId.setText(getText(item, "id"));
            tfId.setDisable(true);
            tfTitle.setText(getText(item, "title"));
            tfDate.setText(getText(item, "date"));
            tfCover.setText(getText(item, "cover"));
            taDescription.setText(getText(item, "description"));
            taLyrics.setText(getText(item, "lyrics"));
            try {
                taRawJson.setText(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(item));
            } catch (Exception e) {
                taRawJson.setText("{}");
            }
        }

        renderPreview(taLyrics.getText());
        taLyrics.textProperty().addListener(obs -> renderPreview(taLyrics.getText()));
    }

    private static String getText(ObjectNode n, String key) {
        var node = n.get(key);
        return (node != null && !node.isNull()) ? node.asText("") : "";
    }

    @FXML public void onChooseCover() {
        FileChooser chooser = new FileChooser();
        chooser.setTitle("Choose image");
        File f = chooser.showOpenDialog(tfId.getScene().getWindow());
        if (f != null && dataService != null) {
            try {
                var dest = dataService.importImage(f);
                tfCover.setText(dest.toString().replace('\\','/'));
            } catch (IOException e) {
                e.printStackTrace();
                showAlert("画像インポート失敗", e.getMessage());
            }
        }
    }

    @FXML public void onSave() {
        try {
            String id = tfId.getText().trim();
            if (id.isEmpty()) { showAlert("Validation", "ID は必須です"); return; }

            List<ObjectNode> list = dataService.readList(kind);

            if (isNew) {
                boolean exists = list.stream().anyMatch(x -> id.equals(getText(x, "id")));
                if (exists) { showAlert("Validation", "同じ ID の項目が既に存在します"); return; }
            }

            item.put("id", id);
            item.put("title", tfTitle.getText().trim());
            item.put("date", tfDate.getText().trim());
            item.put("cover", tfCover.getText().trim());
            item.put("description", taDescription.getText());
            item.put("lyrics", taLyrics.getText());

            try {
                var other = (ObjectNode) mapper.readTree(taRawJson.getText());
                other.fields().forEachRemaining(entry -> {
                    String k = entry.getKey();
                    if (!k.equals("id") && !k.equals("title") && !k.equals("date") && !k.equals("cover") && !k.equals("description") && !k.equals("lyrics")) {
                        item.set(k, entry.getValue());
                    }
                });
            } catch (Exception e) {
                // ignore parse errors in raw JSON
            }

            if (isNew) {
                list.add(item);
            } else {
                for (int i = 0; i < list.size(); i++) {
                    if (getText(list.get(i), "id").equals(id)) {
                        list.set(i, item);
                        break;
                    }
                }
            }

            dataService.writeList(kind, list);
            closeWindow();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert("保存エラー", e.getMessage());
        }
    }

    @FXML public void onCancel() {
        closeWindow();
    }

    private void renderPreview(String md) {
        String html = mdRenderer.render(mdParser.parse(md == null ? "" : md));
        wvPreview.getEngine().loadContent("<html><body style=\"font-family:system-ui; padding:12px;\">" + html + "</body></html>");
    }

    private void closeWindow() {
        Stage s = (Stage) tfId.getScene().getWindow();
        s.close();
    }

    private void showAlert(String title, String msg) {
        Alert a = new Alert(Alert.AlertType.ERROR, msg, ButtonType.OK);
        a.setTitle(title);
        a.showAndWait();
    }
}