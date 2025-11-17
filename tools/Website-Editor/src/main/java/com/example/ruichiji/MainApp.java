package com.example.ruichiji;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.io.IOException;
import java.net.URL;

public class MainApp extends Application {
    @Override
    public void start(Stage primaryStage) throws Exception {
        URL fxml = getClass().getResource("/fxml/MainView.fxml");
        if (fxml == null) {
            throw new IOException("MainView.fxml not found in resources/fxml");
        }
        FXMLLoader loader = new FXMLLoader(fxml);
        Parent root = loader.load(); // 明示的に Parent 型で受ける
        primaryStage.setTitle("Website-Editor");
        primaryStage.setScene(new Scene(root, 1000, 700));
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}