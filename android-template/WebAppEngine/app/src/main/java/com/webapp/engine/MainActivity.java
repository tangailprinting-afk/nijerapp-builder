package com.webapp.engine;
import android.view.Window;
import android.view.WindowInsetsController;
import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Bundle;

import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import androidx.core.graphics.Insets;

import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity
extends AppCompatActivity {

    WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(
        Bundle savedInstanceState
    ) {

        super.onCreate(savedInstanceState);

Window window = getWindow();

if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {

    window.getInsetsController().setSystemBarsAppearance(

        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,

        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS

    );

}

        // NOTIFICATION PERMISSION

        if (

            ContextCompat.checkSelfPermission(

                this,

                Manifest.permission.POST_NOTIFICATIONS

            )

            != PackageManager.PERMISSION_GRANTED

        ) {

            ActivityCompat.requestPermissions(

                this,

                new String[]{

                    Manifest.permission.POST_NOTIFICATIONS

                },

                1

            );

        }

        // LOAD LAYOUT

        setContentView(
            R.layout.activity_main
        );

        // INIT WEBVIEW

        webView =
            findViewById(
                R.id.webView
            );

        // SAFE AREA SUPPORT

        ViewCompat.setOnApplyWindowInsetsListener(

            webView,

            (view, windowInsets) -> {

                Insets insets =

                    windowInsets.getInsets(

                        WindowInsetsCompat.Type.systemBars()

                    );

                view.setPadding(

                    0,

                    insets.top,

                    0,

                    insets.bottom

                );

                return windowInsets;

            }

        );

        // WEB SETTINGS

        WebSettings webSettings =
            webView.getSettings();

        // Enable JavaScript

        webSettings.setJavaScriptEnabled(
            true
        );

        // Enable Storage

        webSettings.setDomStorageEnabled(
            true
        );

        webSettings.setDatabaseEnabled(
            true
        );

        // File Access

        webSettings.setAllowFileAccess(
            true
        );

        webSettings.setAllowContentAccess(
            true
        );

        // Offline Cache

        webSettings.setCacheMode(
            WebSettings.LOAD_DEFAULT
        );

        // Responsive

        webSettings.setLoadWithOverviewMode(
            true
        );

        webSettings.setUseWideViewPort(
            true
        );

        // Mixed Content

        webSettings.setMixedContentMode(

            WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        );

        // Better Mobile Experience

        webSettings.setBuiltInZoomControls(
            false
        );

        webSettings.setDisplayZoomControls(
            false
        );

        webSettings.setSupportZoom(
            false
        );

        // Keep Inside App

        webView.setWebViewClient(
            new WebViewClient()
        );

        // LOAD LOCAL HTML

        webView.loadUrl(

"file:///android_asset/www/index.html"

        );

    }

    @Override
    public void onBackPressed() {

        if(

            webView.canGoBack()

        ){

            webView.goBack();

        }else{

            super.onBackPressed();

        }

    }

}