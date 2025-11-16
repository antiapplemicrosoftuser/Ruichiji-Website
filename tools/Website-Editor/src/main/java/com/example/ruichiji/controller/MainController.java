package com.example.ruichiji.controller;

import com.example.ruichiji.service.DataService;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.control.Tab;
import javafx.scene.control.TabPane;

import java.io.IOException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * MainController: holds 5 tabs and loads a ListView into each, injecting DataService and kind.
 * No folder chooser: DataService will use working directory.
 */
public class MainController {

    @FXML private TabPane tabPane;

    private DataService dataService;
    private final Map<String, ListController> controllers = new HashMap<>();

    @FXML
    private void initialize() {
        try {
            dataService = new DataService();
        } catch (IOException e) {
            throw new RuntimeException("Failed to initialize DataService", e);
        }

        // kinds and tab titles
        String[][] specs = {
                {"topics", "Topics"},
                {"music", "Music"},
                {"movie", "Movie"},
                {"discography", "Discography"},
                {"live", "Live"}
        };

        for (var s : specs) {
            String kind = s[0];
            String title = s[1];
            Tab tab = new Tab(title);
            try {
                URL fxml = getClass().getResource("/fxml/ListView.fxml");
                FXMLLoader loader = new FXMLLoader(fxml);
                Parent content = loader.load(); // Parent にして型を固定しない
                ListController lc = loader.getController();
                lc.setDataService(dataService);
                lc.setKind(kind);
                lc.refreshList();
                controllers.put(kind, lc);
                tab.setContent(content);
                tabPane.getTabs().add(tab);
            } catch (IOException ex) {
                ex.printStackTrace();
            }
        }
    }

    // Optional: expose a method to refresh all lists
    public void refreshAll() {
        controllers.values().forEach(ListController::refreshList);
    }
}