package com.webapp.engine;

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
import androidx.core.view.WindowCompat;

public class MainActivity
extends AppCompatActivity {

    WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(
        Bundle savedInstanceState
    ) {

        super.onCreate(
            savedInstanceState
        );

        // SAFE AREA FIX

        WindowCompat.setDecorFitsSystemWindows(
            getWindow(),
            true
        );

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

        setContentView(
            R.layout.activity_main
        );

        webView =
            findViewById(
                R.id.webView
            );

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

        webSettings.setAllowFileAccessFromFileURLs(
            true
        );

        webSettings.setAllowUniversalAccessFromFileURLs(
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

        // Scroll Bars

        webView.setVerticalScrollBarEnabled(
            false
        );

        webView.setHorizontalScrollBarEnabled(
            false
        );

        // Keep inside app

        webView.setWebViewClient(
            new WebViewClient()
        );

        // Load Local HTML

        webView.loadUrl(

            "file:///android_asset/www/index.html"

        );
    }

    @Override
    public void onBackPressed() {

        if (
            webView.canGoBack()
        ) {

            webView.goBack();

        } else {

            super.onBackPressed();
        }
    }
}