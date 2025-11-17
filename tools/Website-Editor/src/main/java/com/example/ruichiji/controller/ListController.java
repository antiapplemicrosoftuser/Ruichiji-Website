package com.example.ruichiji.controller;

import com.example.ruichiji.service.DataService;
import com.fasterxml.jackson.databind.node.ObjectNode;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.control.*;
import javafx.scene.input.MouseEvent;
import javafx.stage.Modality;
import javafx.stage.Stage;
import javafx.stage.Window;

import java.io.IOException;
import java.net.URL;
import java.util.List;
import java.util.Optional;

/**
 * ListController is used by each tab to show a TableView of entries for a given kind.
 */
public class ListController {

    @FXML private TableView<ObjectNode> table;
    @FXML private TableColumn<ObjectNode, String> colId;
    @FXML private TableColumn<ObjectNode, String> colTitle;
    @FXML private TableColumn<ObjectNode, String> colDate;
    @FXML private Button btnNew;
    @FXML private Button btnEdit;
    @FXML private Button btnDelete;
    @FXML private Button btnRefresh;

    private DataService dataService;
    private String kind;
    private final ObservableList<ObjectNode> items = FXCollections.observableArrayList();

    public void setDataService(DataService ds) {
        this.dataService = ds;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    @FXML
    private void initialize() {
        colId.setCellValueFactory(c -> {
            var node = c.getValue().get("id");
            return new javafx.beans.property.SimpleStringProperty(node == null || node.isNull() ? "" : node.asText(""));
        });
        colTitle.setCellValueFactory(c -> {
            var node = c.getValue().get("title");
            return new javafx.beans.property.SimpleStringProperty(node == null || node.isNull() ? "" : node.asText(""));
        });
        colDate.setCellValueFactory(c -> {
            var node = c.getValue().get("date");
            return new javafx.beans.property.SimpleStringProperty(node == null || node.isNull() ? "" : node.asText(""));
        });

        table.setItems(items);

        table.setOnMouseClicked((MouseEvent click) -> {
            if (click.getClickCount() == 2) {
                var sel = table.getSelectionModel().getSelectedItem();
                if (sel != null) onEdit();
            }
        });

        updateButtons(null);
        table.getSelectionModel().selectedItemProperty().addListener(obs -> updateButtons(table.getSelectionModel().getSelectedItem()));
    }

    public void refreshList() {
        if (dataService == null || kind == null) return;
        try {
            List<ObjectNode> list = dataService.readList(kind);
            items.setAll(list);
        } catch (IOException e) {
            e.printStackTrace();
            showAlert("読み込みエラー", e.getMessage());
        }
    }

    private void updateButtons(ObjectNode sel) {
        boolean has = sel != null;
        btnEdit.setDisable(!has);
        btnDelete.setDisable(!has);
    }

    @FXML
    private void onNew() {
        openEditorFor(null, true);
    }

    @FXML
    private void onEdit() {
        var selected = table.getSelectionModel().getSelectedItem();
        if (selected == null) return;
        openEditorFor(selected, false);
    }

    @FXML
    private void onDelete() {
        var selected = table.getSelectionModel().getSelectedItem();
        if (selected == null) return;
        Alert a = new Alert(Alert.AlertType.CONFIRMATION, "選択した項目を削除しますか？", ButtonType.YES, ButtonType.NO);
        a.setTitle("削除確認");
        Optional<ButtonType> res = a.showAndWait();
        if (res.isPresent() && res.get() == ButtonType.YES) {
            try {
                List<ObjectNode> list = dataService.readList(kind);
                String id = getText(selected, "id");
                list.removeIf(n -> getText(n, "id").equals(id));
                dataService.writeList(kind, list);
                refreshList();
            } catch (IOException e) {
                e.printStackTrace();
                showAlert("削除エラー", e.getMessage());
            }
        }
    }

    // <-- 追加: FXML の btnRefresh が onAction="#onRefresh" を指しているためハンドラを実装
    @FXML
    private void onRefresh() {
        refreshList();
    }
    // -->

    private void openEditorFor(ObjectNode node, boolean isNew) {
        if (dataService == null || kind == null) {
            showAlert("設定エラー", "DataService または kind が設定されていません。");
            return;
        }
        try {
            URL fxml = getClass().getResource("/fxml/EditorView.fxml");
            FXMLLoader loader = new FXMLLoader(fxml);
            Parent root = loader.load();
            EditorController ctrl = loader.getController();
            ctrl.setDataService(dataService);
            ctrl.setKind(kind);
            ctrl.setItem(node, isNew);

            Stage stage = new Stage();
            stage.setTitle(isNew ? "New " + kind : "Edit " + kind);
            stage.initModality(Modality.APPLICATION_MODAL);
            Window owner = table.getScene() != null ? table.getScene().getWindow() : null;
            if (owner != null) stage.initOwner(owner);
            stage.setScene(new javafx.scene.Scene(root));
            stage.showAndWait();

            // after close
            refreshList();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert("読み込みエラー", e.getMessage());
        }
    }

    private static String getText(ObjectNode n, String key) {
        var node = n == null ? null : n.get(key);
        return (node != null && !node.isNull()) ? node.asText("") : "";
    }

    private void showAlert(String title, String msg) {
        Alert a = new Alert(Alert.AlertType.ERROR, msg, ButtonType.OK);
        a.setTitle(title);
        a.showAndWait();
    }
}