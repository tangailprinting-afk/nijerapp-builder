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

public class MainActivity
extends AppCompatActivity {

    WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(
        Bundle savedInstanceState
    ) {

        super.onCreate(savedInstanceState);

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

        // WEB SETTINGS

        WebSettings webSettings =
            webView.getSettings();

        // JAVASCRIPT

        webSettings.setJavaScriptEnabled(
            true
        );

        // STORAGE

        webSettings.setDomStorageEnabled(
            true
        );

        webSettings.setDatabaseEnabled(
            true
        );

        // FILE ACCESS

        webSettings.setAllowFileAccess(
            true
        );

        webSettings.setAllowContentAccess(
            true
        );

        // CACHE

        webSettings.setCacheMode(
            WebSettings.LOAD_DEFAULT
        );

        // RESPONSIVE

        webSettings.setLoadWithOverviewMode(
            true
        );

        webSettings.setUseWideViewPort(
            true
        );

        // MIXED CONTENT

        webSettings.setMixedContentMode(

            WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        );

        // ZOOM

        webSettings.setBuiltInZoomControls(
            false
        );

        webSettings.setDisplayZoomControls(
            false
        );

        webSettings.setSupportZoom(
            false
        );

        // KEEP INSIDE APP

        webView.setWebViewClient(
            new WebViewClient()
        );

        // SAFE TOP + BOTTOM SPACE

        webView.setPadding(

            0,

            getStatusBarHeight(),

            0,

            getNavigationBarHeight()

        );

        webView.setClipToPadding(false);

        // LOAD APP

        webView.loadUrl(

"file:///android_asset/www/index.html"

        );

    }

    // STATUS BAR HEIGHT

    private int getStatusBarHeight() {

        int result = 0;

        int resourceId =
            getResources().getIdentifier(

                "status_bar_height",

                "dimen",

                "android"

            );

        if (resourceId > 0) {

            result =
                getResources().getDimensionPixelSize(
                    resourceId
                );

        }

        return result;

    }

    // NAVIGATION BAR HEIGHT

    private int getNavigationBarHeight() {

        int result = 0;

        int resourceId =
            getResources().getIdentifier(

                "navigation_bar_height",

                "dimen",

                "android"

            );

        if (resourceId > 0) {

            result =
                getResources().getDimensionPixelSize(
                    resourceId
                );

        }

        return result;

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