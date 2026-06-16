package com.webapp.engine;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.os.Bundle;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;

import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity
extends AppCompatActivity {

    private static final String PRINT_BRIDGE_NAME =
        "NijerAppPrinter";

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

        webView.addJavascriptInterface(
            new PrintBridge(),
            PRINT_BRIDGE_NAME
        );

        // KEEP INSIDE APP

        webView.setWebViewClient(
            new WebViewClient() {
                @Override
                public void onPageFinished(
                    WebView view,
                    String url
                ) {

                    super.onPageFinished(
                        view,
                        url
                    );

                    injectPrintBridge();

                }
            }
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

    private void injectPrintBridge() {

        if (webView == null) {

            return;

        }

        String script =
            "(function(){" +
            "if(window.__nijerappPrinterInjected){return;}" +
            "window.__nijerappPrinterInjected=true;" +
            "var bridge=window." + PRINT_BRIDGE_NAME + ";" +
            "if(!bridge){return;}" +
            "var browserPrint=window.print ? window.print.bind(window) : null;" +
            "window.print=function(){" +
            "try{" +
            "var payload={title:document.title||'Print',url:location.href,html:document.documentElement?document.documentElement.outerHTML:'',text:document.body?document.body.innerText:''};" +
            "bridge.printDocument(JSON.stringify(payload));" +
            "}catch(error){" +
            "if(browserPrint){browserPrint();}" +
            "}" +
            "};" +
            "window.AndroidPrinter=bridge;" +
            "})();";

        webView.evaluateJavascript(
            script,
            null
        );

    }

    private void handlePrintPayload(
        String payloadJson
    ) {

        String title = "Print";
        String html = "";
        String text = "";
        String url = "";

        try {

            JSONObject payload =
                new JSONObject(payloadJson);

            title =
                payload.optString(
                    "title",
                    title
                );

            html =
                payload.optString(
                    "html",
                    html
                );

            text =
                payload.optString(
                    "text",
                    text
                );

            url =
                payload.optString(
                    "url",
                    url
                );

        } catch (JSONException ignored) {

        }

        String printableText =
            buildPrintableText(
                title,
                text,
                html,
                url
            );

        if (
            trySunmiPrint(
                title,
                printableText
            )
        ) {

            return;

        }

        printWithSystemPrinter(
            title
        );

    }

    private String buildPrintableText(
        String title,
        String text,
        String html,
        String url
    ) {

        String printableText =
            TextUtils.isEmpty(text)
                ? stripHtml(html)
                : text;

        StringBuilder builder =
            new StringBuilder();

        if (!TextUtils.isEmpty(title)) {

            builder.append(title)
                .append("\n\n");

        }

        if (!TextUtils.isEmpty(url)) {

            builder.append(url)
                .append("\n\n");

        }

        if (!TextUtils.isEmpty(printableText)) {

            builder.append(printableText);

        }

        return builder.toString().trim();

    }

    private String stripHtml(
        String html
    ) {

        if (TextUtils.isEmpty(html)) {

            return "";

        }

        return html
            .replaceAll(
                "(?is)<script.*?>.*?</script>",
                " "
            )
            .replaceAll(
                "(?is)<style.*?>.*?</style>",
                " "
            )
            .replaceAll(
                "(?s)<[^>]*>",
                " "
            )
            .replaceAll(
                "&nbsp;",
                " "
            )
            .replaceAll(
                "\\s+",
                " "
            )
            .trim();

    }

    private boolean trySunmiPrint(
        String jobName,
        String printableText
    ) {

        if (!isSunmiDevice()) {

            return false;

        }

        try {

            Class<?> printerClass =
                findSunmiPrinterClass();

            if (printerClass == null) {

                return false;

            }

            Object printer =
                getSunmiPrinterInstance(
                    printerClass
                );

            if (printer == null) {

                return false;

            }

            boolean printed =
                invokePrinterMethod(
                    printer,
                    "printText",
                    printableText
                )
                || invokePrinterMethod(
                    printer,
                    "printString",
                    printableText
                )
                || invokePrinterMethod(
                    printer,
                    "print",
                    printableText
                );

            if (printed) {

                invokePrinterMethod(
                    printer,
                    "lineWrap",
                    2
                );

                invokePrinterMethod(
                    printer,
                    "cutPaper"
                );

            }

            return printed;

        } catch (Throwable throwable) {

            return false;

        }

    }

    private Class<?> findSunmiPrinterClass() {

        String[] classNames = new String[] {
            "com.sunmi.peripheral.printer.SunmiPrinter",
            "com.sunmi.peripheral.printer.InnerPrinterManager"
        };

        for (String className : classNames) {

            try {

                return Class.forName(
                    className
                );

            } catch (ClassNotFoundException ignored) {

            }

        }

        return null;

    }

    private Object getSunmiPrinterInstance(
        Class<?> printerClass
    ) {

        try {

            return printerClass
                .getMethod("getInstance")
                .invoke(null);

        } catch (Throwable ignored) {

            return null;

        }

    }

    private boolean invokePrinterMethod(
        Object printer,
        String methodName,
        Object... args
    ) {

        try {

            for (
                java.lang.reflect.Method method :
                    printer.getClass().getMethods()
            ) {

                if (
                    !method.getName().equals(methodName)
                ) {

                    continue;

                }

                Class<?>[] parameterTypes =
                    method.getParameterTypes();

                if (
                    parameterTypes.length
                    != args.length
                ) {

                    continue;

                }

                method.invoke(
                    printer,
                    args
                );

                return true;

            }

        } catch (Throwable ignored) {

        }

        return false;

    }

    private boolean isSunmiDevice() {

        String manufacturer =
            android.os.Build.MANUFACTURER;

        String model =
            android.os.Build.MODEL;

        return (
            manufacturer != null
                && manufacturer.equalsIgnoreCase(
                    "SUNMI"
                )
        ) || (
            model != null
                && model.toUpperCase().contains(
                    "SUNMI"
                )
        );

    }

    private void printWithSystemPrinter(
        String jobName
    ) {

        PrintManager printManager =
            (PrintManager) getSystemService(
                Context.PRINT_SERVICE
            );

        if (
            printManager == null
                || webView == null
        ) {

            Toast.makeText(
                this,
                "Printer service unavailable",
                Toast.LENGTH_SHORT
            ).show();

            return;

        }

        PrintDocumentAdapter printDocumentAdapter =
            webView.createPrintDocumentAdapter(
                jobName
            );

        printManager.print(
            jobName,
            printDocumentAdapter,
            new PrintAttributes.Builder().build()
        );

    }

    private final class PrintBridge {

        @JavascriptInterface
        public void printDocument(
            String payloadJson
        ) {

            runOnUiThread(
                () -> handlePrintPayload(
                    payloadJson
                )
            );

        }

        @JavascriptInterface
        public void printText(
            String text
        ) {

            runOnUiThread(
                () -> handlePrintPayload(
                    "{\"title\":\"Print\",\"text\":"
                        + JSONObject.quote(
                            text == null ? "" : text
                        )
                        + "}"
                )
            );

        }

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
