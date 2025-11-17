package com.example.ruichiji.controller;

import com.example.ruichiji.service.DataService;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.layout.GridPane;
import javafx.scene.control.SplitPane;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import javafx.stage.Window;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * EditorController: extended to support per-kind fields and list editors for tracks/setlist.
 */
public class EditorController {

    @FXML private TextField tfId;
    @FXML private TextField tfTitle;
    @FXML private TextField tfDate;
    @FXML private TextField tfCover;
    @FXML private TextArea taDescription; // shown as "Description"/"Content"/"Note"
    @FXML private TextArea taLyrics;
    @FXML private WebView wvPreview;
    @FXML private TextArea taRawJson;
    @FXML private Label lblDescription;
    @FXML private Label lblCover;
    @FXML private HBox coverBox;
    @FXML private SplitPane splitPane;

    // music fields
    @FXML private VBox musicBox;
    @FXML private TextField tfDuration;
    @FXML private TextField tfCredits;
    @FXML private TextField tfAlbums;
    @FXML private TextField tfAudioFile;

    // movie fields
    @FXML private VBox movieBox;
    @FXML private TextField tfService;
    @FXML private TextField tfUploader;
    @FXML private TextField tfVideo;
    @FXML private TextField tfMusicID;

    // discography fields
    @FXML private VBox discographyBox;
    @FXML private TextField tfArtists;
    @FXML private ListView<ObjectNode> lvTracks;

    // live fields
    @FXML private VBox liveBox;
    @FXML private TextField tfVenue;
    @FXML private ListView<ObjectNode> lvSetlist;

    private DataService dataService;
    private String kind;
    private ObjectNode current;
    private boolean isNew;
    private final ObjectMapper mapper = new ObjectMapper();

    // body key used for the main textarea (can be "description", "content", "note", etc.)
    private String contentKey = "description";

    // observable lists for listviews
    private final ObservableList<ObjectNode> tracksList = FXCollections.observableArrayList();
    private final ObservableList<ObjectNode> setlistList = FXCollections.observableArrayList();

    public void setDataService(DataService ds) {
        this.dataService = ds;
    }

    @FXML
    private void initialize() {
        // configure listviews to show friendly text (title)
        lvTracks.setItems(tracksList);
        lvTracks.setCellFactory(tv -> new ListCell<>() {
            @Override
            protected void updateItem(ObjectNode item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) setText(null);
                else {
                    String t = item.has("track_no") ? item.get("track_no").asText() + " - " : "";
                    t += item.has("title") ? item.get("title").asText() : "(no title)";
                    setText(t);
                }
            }
        });

        lvSetlist.setItems(setlistList);
        lvSetlist.setCellFactory(tv -> new ListCell<>() {
            @Override
            protected void updateItem(ObjectNode item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) setText(null);
                else {
                    String t = item.has("title") ? item.get("title").asText() : "(no title)";
                    if (item.has("id") && !item.get("id").asText().isEmpty()) t += " [" + item.get("id").asText() + "]";
                    setText(t);
                }
            }
        });
    }

    /**
     * Configure controller for the given kind (topics, music, movies, discography, live).
     * This sets which UI elements are visible and which JSON key is used for the main body field.
     */
    public void setKind(String kind) {
        this.kind = kind;

        // default settings
        boolean showCover = true;
        boolean showLyrics = false;
        boolean showPreview = false;
        boolean showMusicBox = false;
        boolean showMovieBox = false;
        boolean showDiscographyBox = false;
        boolean showLiveBox = false;
        String bodyKey = "description";
        String bodyLabel = "Description:";

        if ("topics".equals(kind)) {
            showCover = false;
            showLyrics = false;
            showPreview = false;
            bodyKey = "content";
            bodyLabel = "Content:";
        } else if ("music".equals(kind)) {
            showCover = true;
            showLyrics = true;    // music uses lyrics field in our editor
            showPreview = false;
            showMusicBox = true;
            bodyKey = "description"; // keep description as body (if needed)
            bodyLabel = "Description:";
        } else if ("movies".equals(kind)) {
            showCover = false;
            showLyrics = false;
            showPreview = true;   // show web preview for movie URL if available
            showMovieBox = true;
            bodyKey = "description";
            bodyLabel = "Description:";
        } else if ("discography".equals(kind)) {
            showCover = true;
            showDiscographyBox = true;
            bodyKey = "description";
            bodyLabel = "Description:";
        } else if ("live".equals(kind)) {
            showCover = true;     // live uses image field (mapped to tfCover)
            showLiveBox = true;
            bodyKey = "note";     // live's main text is "note"
            bodyLabel = "Note:";
        }

        this.contentKey = bodyKey;

        // Update UI components (null checks in case called before FXML injection)
        if (lblDescription != null) lblDescription.setText(bodyLabel);
        if (coverBox != null) {
            coverBox.setVisible(showCover);
            coverBox.setManaged(showCover);
        }
        if (lblCover != null) {
            lblCover.setVisible(showCover);
            lblCover.setManaged(showCover);
        }
        if (splitPane != null) {
            splitPane.setVisible(showLyrics || showPreview);
            splitPane.setManaged(showLyrics || showPreview);
        }
        if (taLyrics != null) {
            taLyrics.setVisible(showLyrics);
            taLyrics.setManaged(showLyrics);
        }
        if (wvPreview != null) {
            wvPreview.setVisible(showPreview);
            wvPreview.setManaged(showPreview);
        }

        if (musicBox != null) {
            musicBox.setVisible(showMusicBox);
            musicBox.setManaged(showMusicBox);
        }
        if (movieBox != null) {
            movieBox.setVisible(showMovieBox);
            movieBox.setManaged(showMovieBox);
        }
        if (discographyBox != null) {
            discographyBox.setVisible(showDiscographyBox);
            discographyBox.setManaged(showDiscographyBox);
        }
        if (liveBox != null) {
            liveBox.setVisible(showLiveBox);
            liveBox.setManaged(showLiveBox);
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
        // Ensure label matches kind even if populateFields called after setKind
        if (lblDescription != null) {
            if ("topics".equals(kind)) lblDescription.setText("Content:");
            else if ("live".equals(kind)) lblDescription.setText("Note:");
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
            tfDuration.setText("");
            tfCredits.setText("");
            tfAlbums.setText("");
            tfAudioFile.setText("");
            tfService.setText("");
            tfUploader.setText("");
            tfVideo.setText("");
            tfMusicID.setText("");
            tfArtists.setText("");
            tfVenue.setText("");
            tracksList.clear();
            setlistList.clear();
            tfId.setEditable(true); // new item -> allow editing id
            return;
        }

        tfId.setText(getText(current, "id"));
        tfTitle.setText(getText(current, "title"));
        tfDate.setText(getText(current, "date"));

        // cover may be named "cover" or "image" in some kinds; try both
        String coverVal = getText(current, "cover");
        if (coverVal.isEmpty()) coverVal = getText(current, "image");
        tfCover.setText(coverVal);

        // main body: use contentKey (e.g. "content" for topics, "note" for live)
        String body = getText(current, contentKey);
        if (body.isEmpty() && !"description".equals(contentKey)) {
            body = getText(current, "description");
        }
        taDescription.setText(body);

        // lyrics: if JSON contains lyricsFile, load from file; else fallback to "lyrics" field
        String lyricsText = "";
        try {
            String lyricsFilePath = getText(current, "lyricsFile");
            if (!lyricsFilePath.isEmpty() && dataService != null) {
                String loaded = dataService.readLyricsFile(lyricsFilePath);
                if (loaded != null) lyricsText = loaded;
            } else {
                lyricsText = getText(current, "lyrics");
            }
        } catch (Exception ex) {
            // ignore and fallback
            lyricsText = getText(current, "lyrics");
        }
        taLyrics.setText(lyricsText);

        // music specific
        tfDuration.setText(getText(current, "duration"));

        // credits array -> comma separated
        String credits = "";
        if (current.has("credits") && current.get("credits").isArray()) {
            credits = String.join(", ",
                iterableToList(current.get("credits")).stream().map(JsonNode::asText).collect(Collectors.toList()));
        }
        tfCredits.setText(credits);

        String albums = "";
        if (current.has("albums") && current.get("albums").isArray()) {
            albums = String.join(", ",
                iterableToList(current.get("albums")).stream().map(JsonNode::asText).collect(Collectors.toList()));
        }
        tfAlbums.setText(albums);

        tfAudioFile.setText(getText(current, "audioFile"));

        // movie specific
        tfService.setText(getText(current, "service"));
        tfUploader.setText(getText(current, "uploader"));
        tfVideo.setText(getText(current, "video"));
        tfMusicID.setText(getText(current, "musicID"));

        // discography
        tfArtists.setText(String.join(", ", iterableToList(current.get("artists")).stream().map(JsonNode::asText).collect(Collectors.toList())));

        // tracks (array of objects)
        tracksList.clear();
        if (current.has("tracks") && current.get("tracks").isArray()) {
            for (JsonNode tn : current.get("tracks")) {
                if (tn.isObject()) tracksList.add((ObjectNode) tn);
            }
        }

        // live specific: venue and setlist
        tfVenue.setText(getText(current, "venue"));
        setlistList.clear();
        if (current.has("setlist") && current.get("setlist").isArray()) {
            for (JsonNode sn : current.get("setlist")) {
                if (sn.isObject()) setlistList.add((ObjectNode) sn);
            }
        }

        // Raw JSON preview
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

            // Write the main body according to contentKey
            node.put(contentKey, taDescription.getText() == null ? "" : taDescription.getText());

            // Per-kind handling: only include fields that make sense for the kind
            switch (kind) {
                case "topics":
                    node.remove("cover");
                    node.remove("lyrics");
                    node.remove("description");
                    node.remove("image");
                    node.remove("lyricsFile");
                    break;
                case "music":
                    if (tfCover.getText() != null && !tfCover.getText().isBlank())
                        node.put("cover", tfCover.getText());
                    else node.remove("cover");

                    if (tfDuration.getText() != null && !tfDuration.getText().isBlank())
                        node.put("duration", tfDuration.getText());
                    else node.remove("duration");

                    // credits -> array
                    if (tfCredits.getText() != null && !tfCredits.getText().isBlank()) {
                        ArrayNode arr = mapper.createArrayNode();
                        for (String s : tfCredits.getText().split(",")) {
                            String t = s.trim();
                            if (!t.isEmpty()) arr.add(t);
                        }
                        node.set("credits", arr);
                    } else node.remove("credits");

                    // albums -> array
                    if (tfAlbums.getText() != null && !tfAlbums.getText().isBlank()) {
                        ArrayNode arr = mapper.createArrayNode();
                        for (String s : tfAlbums.getText().split(",")) {
                            String t = s.trim();
                            if (!t.isEmpty()) arr.add(t);
                        }
                        node.set("albums", arr);
                    } else node.remove("albums");

                    if (tfAudioFile.getText() != null && !tfAudioFile.getText().isBlank())
                        node.put("audioFile", tfAudioFile.getText());
                    else node.remove("audioFile");

                    // lyrics: save to file and set lyricsFile
                    String lyricsTxt = taLyrics.getText() == null ? "" : taLyrics.getText();
                    String idForFile = node.has("id") ? node.get("id").asText() : "";
                    if (!lyricsTxt.isBlank()) {
                        if (idForFile == null || idForFile.isBlank()) {
                            showAlert("保存エラー", "楽曲ID が空です。歌詞をファイル保存するには ID を入力してください。");
                            return;
                        }
                        // save file under assets/data/lyrics/<id>.txt, get relative path (without 'assets/' prefix)
                        String relPath = dataService.saveLyricsFile(idForFile, lyricsTxt);
                        node.put("lyricsFile", relPath);
                        // remove inline lyrics field if present
                        node.remove("lyrics");
                    } else {
                        node.remove("lyricsFile");
                        node.remove("lyrics");
                    }
                    break;
                case "movies":
                    node.remove("lyrics");
                    node.remove("cover");
                    if (tfService.getText() != null && !tfService.getText().isBlank()) node.put("service", tfService.getText());
                    else node.remove("service");
                    if (tfUploader.getText() != null && !tfUploader.getText().isBlank()) node.put("uploader", tfUploader.getText());
                    else node.remove("uploader");
                    if (tfVideo.getText() != null && !tfVideo.getText().isBlank()) node.put("video", tfVideo.getText());
                    else node.remove("video");
                    if (tfMusicID.getText() != null && !tfMusicID.getText().isBlank()) node.put("musicID", tfMusicID.getText());
                    else node.remove("musicID");
                    break;
                case "discography":
                    if (tfCover.getText() != null && !tfCover.getText().isBlank())
                        node.put("cover", tfCover.getText());
                    else node.remove("cover");

                    // artists -> array
                    if (tfArtists.getText() != null && !tfArtists.getText().isBlank()) {
                        ArrayNode arr = mapper.createArrayNode();
                        for (String s : tfArtists.getText().split(",")) {
                            String t = s.trim();
                            if (!t.isEmpty()) arr.add(t);
                        }
                        node.set("artists", arr);
                    } else node.remove("artists");

                    // tracks -> use tracksList
                    ArrayNode tracksArr = mapper.createArrayNode();
                    for (ObjectNode on : tracksList) tracksArr.add(on);
                    node.set("tracks", tracksArr);
                    node.remove("lyrics");
                    break;
                case "live":
                    // image vs cover
                    if (tfCover.getText() != null && !tfCover.getText().isBlank())
                        node.put("image", tfCover.getText());
                    else {
                        node.remove("image");
                        node.remove("cover");
                    }
                    node.remove("lyrics");

                    if (tfVenue.getText() != null && !tfVenue.getText().isBlank()) node.put("venue", tfVenue.getText());
                    else node.remove("venue");

                    // setlist -> use setlistList
                    ArrayNode setArr = mapper.createArrayNode();
                    for (ObjectNode on : setlistList) setArr.add(on);
                    node.set("setlist", setArr);
                    break;
                default:
                    node.remove("lyrics");
                    break;
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

    // ---- Track / Setlist item editors ----
    @FXML
    private void onAddTrack() { ObjectNode n = showTrackDialog(null); if (n != null) tracksList.add(n); }
    @FXML
    private void onEditTrack() {
        ObjectNode sel = lvTracks.getSelectionModel().getSelectedItem();
        if (sel == null) { showAlert("選択エラー", "編集するトラックを選択してください。"); return; }
        ObjectNode updated = showTrackDialog(sel.deepCopy());
        if (updated != null) {
            int idx = lvTracks.getSelectionModel().getSelectedIndex();
            tracksList.set(idx, updated);
        }
    }
    @FXML
    private void onRemoveTrack() {
        ObjectNode sel = lvTracks.getSelectionModel().getSelectedItem();
        if (sel != null) tracksList.remove(sel);
    }

    private ObjectNode showTrackDialog(ObjectNode initial) {
        Dialog<ButtonType> dlg = new Dialog<>();
        dlg.setTitle(initial == null ? "Add Track" : "Edit Track");
        GridPane g = new GridPane();
        g.setHgap(8); g.setVgap(8);
        TextField tfNo = new TextField(), tfTitle = new TextField(), tfMusic = new TextField(), tfAuthor = new TextField();
        g.add(new Label("Track No:"), 0, 0); g.add(tfNo, 1, 0);
        g.add(new Label("Title:"), 0, 1); g.add(tfTitle, 1, 1);
        g.add(new Label("MusicID:"), 0, 2); g.add(tfMusic, 1, 2);
        g.add(new Label("Author:"), 0, 3); g.add(tfAuthor, 1, 3);
        if (initial != null) {
            tfNo.setText(getText(initial, "track_no"));
            tfTitle.setText(getText(initial, "title"));
            tfMusic.setText(getText(initial, "musicID"));
            tfAuthor.setText(getText(initial, "author"));
        }
        dlg.getDialogPane().setContent(g);
        dlg.getDialogPane().getButtonTypes().addAll(ButtonType.OK, ButtonType.CANCEL);
        dlg.setResultConverter(bt -> bt);
        var res = dlg.showAndWait();
        if (res.isPresent() && res.get() == ButtonType.OK) {
            ObjectNode out = mapper.createObjectNode();
            String no = tfNo.getText() == null ? "" : tfNo.getText().trim();
            if (!no.isEmpty()) {
                // if numeric, try number; else keep as text (e.g., "Ex")
                try { out.put("track_no", Integer.parseInt(no)); } catch (Exception ex) { out.put("track_no", no); }
            }
            out.put("title", tfTitle.getText() == null ? "" : tfTitle.getText());
            if (tfMusic.getText() != null && !tfMusic.getText().isBlank()) out.put("musicID", tfMusic.getText());
            if (tfAuthor.getText() != null && !tfAuthor.getText().isBlank()) out.put("author", tfAuthor.getText());
            return out;
        }
        return null;
    }

    @FXML private void onAddSetlist() { ObjectNode n = showSetlistDialog(null); if (n != null) setlistList.add(n); }
    @FXML private void onEditSetlist() {
        ObjectNode sel = lvSetlist.getSelectionModel().getSelectedItem();
        if (sel == null) { showAlert("選択エラー", "編集するセットリスト項目を選択してください。"); return; }
        ObjectNode updated = showSetlistDialog(sel.deepCopy());
        if (updated != null) {
            int idx = lvSetlist.getSelectionModel().getSelectedIndex();
            setlistList.set(idx, updated);
        }
    }
    @FXML private void onRemoveSetlist() {
        ObjectNode sel = lvSetlist.getSelectionModel().getSelectedItem();
        if (sel != null) setlistList.remove(sel);
    }

    private ObjectNode showSetlistDialog(ObjectNode initial) {
        Dialog<ButtonType> dlg = new Dialog<>();
        dlg.setTitle(initial == null ? "Add Setlist Item" : "Edit Setlist Item");
        GridPane g = new GridPane();
        g.setHgap(8); g.setVgap(8);
        TextField tfTitle = new TextField(), tfIdField = new TextField();
        g.add(new Label("Title:"), 0, 0); g.add(tfTitle, 1, 0);
        g.add(new Label("ID (optional):"), 0, 1); g.add(tfIdField, 1, 1);
        if (initial != null) {
            tfTitle.setText(getText(initial, "title"));
            tfIdField.setText(getText(initial, "id"));
        }
        dlg.getDialogPane().setContent(g);
        dlg.getDialogPane().getButtonTypes().addAll(ButtonType.OK, ButtonType.CANCEL);
        dlg.setResultConverter(bt -> bt);
        var res = dlg.showAndWait();
        if (res.isPresent() && res.get() == ButtonType.OK) {
            ObjectNode out = mapper.createObjectNode();
            out.put("title", tfTitle.getText() == null ? "" : tfTitle.getText());
            if (tfIdField.getText() != null && !tfIdField.getText().isBlank()) out.put("id", tfIdField.getText());
            return out;
        }
        return null;
    }

    @FXML
    private void onCancel() {
        Window w = tfId.getScene().getWindow();
        if (w instanceof Stage) ((Stage) w).close();
    }

    @FXML
    private void onChooseCover() {
        showAlert("未実装", "カバー選択は未実装です。URLを直接入力してください。");
    }

    @FXML
    private void onChooseAudio() {
        showAlert("未実装", "オーディオファイル選択は未実装です。ファイルパス/URLを直接入力してください。");
    }

    private static String getText(ObjectNode n, String key) {
        if (n == null || !n.has(key)) return "";
        JsonNode node = n.get(key);
        return node == null || node.isNull() ? "" : node.asText("");
    }

    private static java.util.List<JsonNode> iterableToList(JsonNode a) {
        if (a == null || !a.isArray()) return java.util.Collections.emptyList();
        java.util.List<JsonNode> out = new java.util.ArrayList<>();
        a.forEach(out::add);
        return out;
    }

    private void showAlert(String title, String msg) {
        Alert a = new Alert(Alert.AlertType.ERROR, msg, ButtonType.OK);
        a.setTitle(title);
        a.showAndWait();
    }
}