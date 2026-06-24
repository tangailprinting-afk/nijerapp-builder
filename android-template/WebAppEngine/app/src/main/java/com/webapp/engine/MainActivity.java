package com.webapp.engine;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Set;
import java.util.UUID;

import org.json.JSONException;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity
extends AppCompatActivity {

    private static final String PRINT_BRIDGE_NAME =
        "NijerAppPrinter";
    private static final String[] PRINT_BRIDGE_ALIASES =
        new String[] {
            "NativePrintBridge",
            "AndroidPrintBridge",
            "NativePrintAPI",
            "sunmiPrinter",
            "SUNMIPrinter",
            "NijerAppPrinter",
            "AndroidPrinter",
            "NativeBridge",
            "Android",
            "android",
            "printer"
        };
    private static final String PREFERENCES_NAME =
        "printer_bridge_prefs";
    private static final String PREF_BT_ADDRESS =
        "selected_bluetooth_printer_address";
    private static final String PREF_BT_NAME =
        "selected_bluetooth_printer_name";
    private static final String PREF_PRINTER_MODE =
        "selected_printer_mode";
    private static final String MODE_AUTO = "auto";
    private static final String MODE_BLUETOOTH = "bluetooth";
    private static final String MODE_SUNMI = "sunmi";
    private static final String MODE_SYSTEM = "system";
    private static final UUID SPP_UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final int REQUEST_PERMISSIONS_CODE = 1904;

    WebView webView;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket bluetoothSocket;
    private OutputStream bluetoothOutputStream;
    private BluetoothDevice connectedBluetoothDevice;
    private final ArrayList<JSONObject> discoveredPrinters =
        new ArrayList<>();
    private final Handler mainHandler =
        new Handler(Looper.getMainLooper());
    private final Object bluetoothLock = new Object();
    private SharedPreferences printerPreferences;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(
        Bundle savedInstanceState
    ) {

        super.onCreate(savedInstanceState);
        printerPreferences =
            getSharedPreferences(
                PREFERENCES_NAME,
                MODE_PRIVATE
            );
        bluetoothAdapter =
            BluetoothAdapter.getDefaultAdapter();
        registerBluetoothDiscoveryReceiver();
        requestRuntimePermissions();

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
                    pushPrinterState();

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

    @Override
    protected void onDestroy() {

        unregisterBluetoothDiscoveryReceiver();
        closeBluetoothConnection();
        super.onDestroy();

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
            "window.NativePrintBridge=bridge;" +
            "window.AndroidPrintBridge=bridge;" +
            "window.NativePrintAPI=bridge;" +
            "window.sunmiPrinter=bridge;" +
            "window.SUNMIPrinter=bridge;" +
            "window.NijerAppPrinter=bridge;" +
            "window.AndroidPrinter=bridge;" +
            "window.NativeBridge=bridge;" +
            "window.Android=bridge;" +
            "window.android=bridge;" +
            "window.printer=bridge;" +
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
            tryBluetoothPrint(
                printableText
            )
        ) {

            return;

        }

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

    private void requestRuntimePermissions() {

        ArrayList<String> permissions =
            new ArrayList<>();

        if (
            Build.VERSION.SDK_INT
            >= Build.VERSION_CODES.S
        ) {

            if (
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.BLUETOOTH_CONNECT
                ) != PackageManager.PERMISSION_GRANTED
            ) {

                permissions.add(
                    Manifest.permission.BLUETOOTH_CONNECT
                );

            }

            if (
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.BLUETOOTH_SCAN
                ) != PackageManager.PERMISSION_GRANTED
            ) {

                permissions.add(
                    Manifest.permission.BLUETOOTH_SCAN
                );

            }

        } else {

            if (
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.BLUETOOTH
                ) != PackageManager.PERMISSION_GRANTED
            ) {

                permissions.add(
                    Manifest.permission.BLUETOOTH
                );

            }

            if (
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.BLUETOOTH_ADMIN
                ) != PackageManager.PERMISSION_GRANTED
            ) {

                permissions.add(
                    Manifest.permission.BLUETOOTH_ADMIN
                );

            }

            if (
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) != PackageManager.PERMISSION_GRANTED
            ) {

                permissions.add(
                    Manifest.permission.ACCESS_FINE_LOCATION
                );

            }

        }

        if (!permissions.isEmpty()) {

            ActivityCompat.requestPermissions(
                this,
                permissions.toArray(
                    new String[0]
                ),
                REQUEST_PERMISSIONS_CODE
            );

        }

    }

    private void registerBluetoothDiscoveryReceiver() {

        if (bluetoothAdapter == null) {

            return;

        }

        bluetoothDiscoveryReceiver =
            new BroadcastReceiver() {
                @Override
                public void onReceive(
                    Context context,
                    Intent intent
                ) {

                    String action =
                        intent.getAction();

                    if (
                        BluetoothDevice.ACTION_FOUND.equals(
                            action
                        )
                    ) {

                        BluetoothDevice device;

                        if (
                            Build.VERSION.SDK_INT
                            >= Build.VERSION_CODES.TIRAMISU
                        ) {

                            device =
                                intent.getParcelableExtra(
                                    BluetoothDevice.EXTRA_DEVICE,
                                    BluetoothDevice.class
                                );

                        } else {

                            device =
                                intent.getParcelableExtra(
                                    BluetoothDevice.EXTRA_DEVICE
                                );

                        }

                        if (device != null) {

                            addDiscoveredPrinter(
                                device
                            );

                        }

                    } else if (
                        BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(
                            action
                        )
                    ) {

                        pushPrinterState();

                    }

                }
            };

        IntentFilter filter =
            new IntentFilter();
        filter.addAction(
            BluetoothDevice.ACTION_FOUND
        );
        filter.addAction(
            BluetoothAdapter.ACTION_DISCOVERY_FINISHED
        );

        if (
            Build.VERSION.SDK_INT
            >= Build.VERSION_CODES.TIRAMISU
        ) {

            registerReceiver(
                bluetoothDiscoveryReceiver,
                filter,
                Context.RECEIVER_NOT_EXPORTED
            );

        } else {

            registerReceiver(
                bluetoothDiscoveryReceiver,
                filter
            );

        }

    }

    private void unregisterBluetoothDiscoveryReceiver() {

        if (bluetoothDiscoveryReceiver == null) {

            return;

        }

        try {

            unregisterReceiver(
                bluetoothDiscoveryReceiver
            );

        } catch (IllegalArgumentException ignored) {

        }

        bluetoothDiscoveryReceiver = null;

    }

    private boolean hasBluetoothPermissions() {

        if (
            Build.VERSION.SDK_INT
            >= Build.VERSION_CODES.S
        ) {

            return ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.BLUETOOTH_SCAN
                ) == PackageManager.PERMISSION_GRANTED;

        }

        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.BLUETOOTH
        ) == PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.BLUETOOTH_ADMIN
            ) == PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

    }

    private JSONObject createPrinterJson(
        BluetoothDevice device,
        String source
    ) throws JSONException {

        JSONObject printer =
            new JSONObject();

        printer.put(
            "name",
            device.getName() == null ? "Unknown" : device.getName()
        );
        printer.put(
            "address",
            device.getAddress()
        );
        printer.put(
            "bondState",
            device.getBondState()
        );
        printer.put(
            "type",
            device.getType()
        );
        printer.put(
            "source",
            source
        );

        return printer;

    }

    private void addDiscoveredPrinter(
        BluetoothDevice device
    ) {

        try {

            String address =
                device.getAddress();

            for (JSONObject printer : discoveredPrinters) {

                if (
                    address.equals(
                        printer.optString("address")
                    )
                ) {

                    return;

                }

            }

            discoveredPrinters.add(
                createPrinterJson(
                    device,
                    "discovered"
                )
            );

            pushPrinterState();

        } catch (JSONException ignored) {

        }

    }

    private void pushPrinterState() {

        if (webView == null) {

            return;

        }

        String stateJson =
            getPrinterStateJson();

        mainHandler.post(
            () ->
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('printer-bridge-state',{detail:"
                        + JSONObject.quote(
                            stateJson
                        )
                        + "}));",
                    null
                )
        );

    }

    private String getPrinterStateJson() {

        JSONObject state =
            new JSONObject();

        try {

            state.put(
                "mode",
                printerPreferences.getString(
                    PREF_PRINTER_MODE,
                    MODE_AUTO
                )
            );
            state.put(
                "connected",
                bluetoothSocket != null
                    && bluetoothSocket.isConnected()
            );
            state.put(
                "selectedBluetoothAddress",
                printerPreferences.getString(
                    PREF_BT_ADDRESS,
                    ""
                )
            );
            state.put(
                "selectedBluetoothName",
                printerPreferences.getString(
                    PREF_BT_NAME,
                    ""
                )
            );
            state.put(
                "connectedBluetoothName",
                connectedBluetoothDevice == null
                    ? ""
                    : connectedBluetoothDevice.getName()
            );
            state.put(
                "canUseBluetooth",
                bluetoothAdapter != null
            );
            state.put(
                "bluetoothPermissionsGranted",
                hasBluetoothPermissions()
            );

            JSONArray paired =
                new JSONArray();

            Set<BluetoothDevice> bondedDevices = null;
            if (
                bluetoothAdapter != null
                    && hasBluetoothPermissions()
            ) {

                bondedDevices =
                    bluetoothAdapter.getBondedDevices();

            }

            if (bondedDevices != null) {

                for (BluetoothDevice device : bondedDevices) {

                    paired.put(
                        createPrinterJson(
                            device,
                            "paired"
                        )
                    );

                }

            }

            state.put(
                "paired",
                paired
            );

            JSONArray discovered =
                new JSONArray();
            for (JSONObject printer : discoveredPrinters) {

                discovered.put(
                    printer
                );

            }
            state.put(
                "discovered",
                discovered
            );

        } catch (JSONException ignored) {

        }

        return state.toString();

    }

    private JSONArray getPairedPrintersArray()
        throws JSONException {

        JSONArray printers =
            new JSONArray();

        if (bluetoothAdapter == null) {

            return printers;

        }

        if (!hasBluetoothPermissions()) {

            return printers;

        }

        Set<BluetoothDevice> bondedDevices =
            bluetoothAdapter.getBondedDevices();

        if (bondedDevices == null) {

            return printers;

        }

        for (BluetoothDevice device : bondedDevices) {

            printers.put(
                createPrinterJson(
                    device,
                    "paired"
                )
            );

        }

        return printers;

    }

    private JSONObject findPrinterByAddress(
        String address
    ) throws JSONException {

        if (bluetoothAdapter == null || TextUtils.isEmpty(address)) {

            return null;

        }

        if (!hasBluetoothPermissions()) {

            return null;

        }

        Set<BluetoothDevice> bondedDevices =
            bluetoothAdapter.getBondedDevices();

        if (bondedDevices != null) {

            for (BluetoothDevice device : bondedDevices) {

                if (
                    address.equals(
                        device.getAddress()
                    )
                ) {

                    return createPrinterJson(
                        device,
                        "paired"
                    );

                }

            }

        }

        for (JSONObject printer : discoveredPrinters) {

            if (
                address.equals(
                    printer.optString("address")
                )
            ) {

                return printer;

            }

        }

        return null;

    }

    private String startBluetoothDiscovery() {

        JSONObject response =
            new JSONObject();

        try {

            if (bluetoothAdapter == null) {

                response.put(
                    "success",
                    false
                );
                response.put(
                    "error",
                    "Bluetooth unavailable"
                );
                return response.toString();

            }

            if (!hasBluetoothPermissions()) {

                response.put(
                    "success",
                    false
                );
                response.put(
                    "error",
                    "Missing bluetooth permissions"
                );
                return response.toString();

            }

            bluetoothAdapter.cancelDiscovery();
            discoveredPrinters.clear();
            bluetoothAdapter.startDiscovery();

            response.put(
                "success",
                true
            );
            response.put(
                "status",
                "discovering"
            );

        } catch (JSONException ignored) {

        }

        pushPrinterState();

        return response.toString();

    }

    private String connectBluetoothPrinterInternal(
        String address
    ) {

        JSONObject response =
            new JSONObject();

        try {

            if (bluetoothAdapter == null) {

                response.put(
                    "success",
                    false
                );
                response.put(
                    "error",
                    "Bluetooth unavailable"
                );
                return response.toString();

            }

            if (!hasBluetoothPermissions()) {

                response.put(
                    "success",
                    false
                );
                response.put(
                    "error",
                    "Missing bluetooth permissions"
                );
                return response.toString();

            }

            BluetoothDevice device =
                bluetoothAdapter.getRemoteDevice(
                    address
                );

            if (device == null) {

                response.put(
                    "success",
                    false
                );
                response.put(
                    "error",
                    "Printer not found"
                );
                return response.toString();

            }

            bluetoothAdapter.cancelDiscovery();
            closeBluetoothConnection();

            BluetoothSocket socket =
                device.createRfcommSocketToServiceRecord(
                    SPP_UUID
                );
            socket.connect();

            synchronized (bluetoothLock) {

                bluetoothSocket = socket;
                bluetoothOutputStream =
                    socket.getOutputStream();
                connectedBluetoothDevice = device;
            }

            saveSelectedBluetoothPrinter(
                device,
                MODE_BLUETOOTH
            );

            response.put(
                "success",
                true
            );
            response.put(
                "name",
                device.getName()
            );
            response.put(
                "address",
                device.getAddress()
            );

        } catch (Exception error) {

            closeBluetoothConnection();

            try {

                response.put(
                    "success",
                    false
                );
                response.put(
                    "error",
                    error.getMessage()
                );

            } catch (JSONException ignored) {

            }

        }

        pushPrinterState();
        return response.toString();

    }

    private void saveSelectedBluetoothPrinter(
        BluetoothDevice device,
        String mode
    ) {

        SharedPreferences.Editor editor =
            printerPreferences.edit();
        editor.putString(
            PREF_BT_ADDRESS,
            device.getAddress()
        );
        editor.putString(
            PREF_BT_NAME,
            device.getName() == null ? "" : device.getName()
        );
        editor.putString(
            PREF_PRINTER_MODE,
            mode
        );
        editor.apply();

    }

    private String disconnectBluetoothPrinterInternal() {

        closeBluetoothConnection();

        SharedPreferences.Editor editor =
            printerPreferences.edit();
        editor.putString(
            PREF_PRINTER_MODE,
            MODE_AUTO
        );
        editor.apply();

        pushPrinterState();

        JSONObject response =
            new JSONObject();

        try {

            response.put(
                "success",
                true
            );

        } catch (JSONException ignored) {

        }

        return response.toString();

    }

    private void closeBluetoothConnection() {

        synchronized (bluetoothLock) {

            try {

                if (bluetoothOutputStream != null) {

                    bluetoothOutputStream.close();

                }

            } catch (IOException ignored) {

            }

            try {

                if (bluetoothSocket != null) {

                    bluetoothSocket.close();

                }

            } catch (IOException ignored) {

            }

            bluetoothOutputStream = null;
            bluetoothSocket = null;
            connectedBluetoothDevice = null;

        }

    }

    private String tryReconnectSavedBluetoothPrinter() {

        String savedAddress =
            printerPreferences.getString(
                PREF_BT_ADDRESS,
                ""
            );

        if (TextUtils.isEmpty(savedAddress)) {

            return "";

        }

        if (
            bluetoothSocket != null
                && bluetoothSocket.isConnected()
                && connectedBluetoothDevice != null
                && savedAddress.equals(
                    connectedBluetoothDevice.getAddress()
                )
        ) {

            return "";

        }

        return connectBluetoothPrinterInternal(
            savedAddress
        );

    }

    private boolean tryBluetoothPrint(
        String printableText
    ) {

        if (bluetoothAdapter == null) {

            return false;

        }

        String printerMode =
            printerPreferences.getString(
                PREF_PRINTER_MODE,
                MODE_AUTO
            );

        boolean shouldPreferBluetooth =
            MODE_BLUETOOTH.equals(printerMode)
                || bluetoothSocket != null
                || connectedBluetoothDevice != null;

        if (!shouldPreferBluetooth) {

            return false;

        }

        if (
            bluetoothSocket == null
                || !bluetoothSocket.isConnected()
        ) {

            String reconnectResult =
                tryReconnectSavedBluetoothPrinter();

            if (
                TextUtils.isEmpty(reconnectResult)
            ) {

                return false;

            }

            try {

                JSONObject response =
                    new JSONObject(
                        reconnectResult
                    );

                if (
                    !response.optBoolean(
                        "success",
                        false
                    )
                ) {

                    return false;

                }

            } catch (JSONException ignored) {

                return false;

            }

        }

        return sendBluetoothPrint(
            printableText
        );

    }

    private boolean sendBluetoothPrint(
        String printableText
    ) {

        synchronized (bluetoothLock) {

            if (
                bluetoothOutputStream == null
                || bluetoothSocket == null
                || !bluetoothSocket.isConnected()
            ) {

                return false;

            }

            try {

                bluetoothOutputStream.write(
                    buildEscPosBytes(
                        printableText
                    )
                );
                bluetoothOutputStream.flush();

                return true;

            } catch (IOException error) {

                closeBluetoothConnection();
                pushPrinterState();
                return false;

            }

        }

    }

    private byte[] buildEscPosBytes(
        String printableText
    ) {

        ByteArrayOutputStream outputStream =
            new ByteArrayOutputStream();

        try {

            outputStream.write(
                new byte[] {
                    0x1B,
                    0x40
                }
            );
            outputStream.write(
                printableText.getBytes(
                    Charset.forName("UTF-8")
                )
            );
            outputStream.write(
                new byte[] {
                    0x0A,
                    0x0A,
                    0x0A
                }
            );
            outputStream.write(
                new byte[] {
                    0x1D,
                    0x56,
                    0x00
                }
            );

        } catch (IOException ignored) {

        }

        return outputStream.toByteArray();

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

        mainHandler.post(
            () -> {

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
        );

    }

    private final class PrintBridge {

        @JavascriptInterface
        public void printDocument(
            String payloadJson
        ) {

            handlePrintPayload(
                payloadJson
            );

        }

        @JavascriptInterface
        public String getPrinterState() {

            return getPrinterStateJson();

        }

        @JavascriptInterface
        public String getPairedPrinters() {

            try {

                return getPairedPrintersArray().toString();

            } catch (JSONException error) {

                return "[]";

            }

        }

        @JavascriptInterface
        public String getDiscoveredPrinters() {

            JSONArray printers =
                new JSONArray();

            for (JSONObject printer : discoveredPrinters) {

                printers.put(
                    printer
                );

            }

            return printers.toString();

        }

        @JavascriptInterface
        public String startDiscovery() {

            return startBluetoothDiscovery();

        }

        @JavascriptInterface
        public String connectBluetoothPrinter(
            String address
        ) {

            return connectBluetoothPrinterInternal(
                address
            );

        }

        @JavascriptInterface
        public String disconnectBluetoothPrinter() {

            return disconnectBluetoothPrinterInternal();

        }

        @JavascriptInterface
        public String saveBluetoothPrinter(
            String address,
            String name
        ) {

            JSONObject response =
                new JSONObject();

            try {

                printerPreferences.edit()
                    .putString(
                        PREF_BT_ADDRESS,
                        address == null ? "" : address
                    )
                    .putString(
                        PREF_BT_NAME,
                        name == null ? "" : name
                    )
                    .putString(
                        PREF_PRINTER_MODE,
                        MODE_BLUETOOTH
                    )
                    .apply();

                response.put(
                    "success",
                    true
                );

            } catch (JSONException ignored) {

            }

            pushPrinterState();
            return response.toString();

        }

        @JavascriptInterface
        public String setPrinterMode(
            String mode
        ) {

            SharedPreferences.Editor editor =
                printerPreferences.edit();
            editor.putString(
                PREF_PRINTER_MODE,
                TextUtils.isEmpty(mode)
                    ? MODE_AUTO
                    : mode
            );
            editor.apply();

            pushPrinterState();

            JSONObject response =
                new JSONObject();

            try {

                response.put(
                    "success",
                    true
                );

            } catch (JSONException ignored) {

            }

            return response.toString();

        }

        @JavascriptInterface
        public String getSavedBluetoothPrinter() {

            JSONObject response =
                new JSONObject();

            try {

                response.put(
                    "address",
                    printerPreferences.getString(
                        PREF_BT_ADDRESS,
                        ""
                    )
                );
                response.put(
                    "name",
                    printerPreferences.getString(
                        PREF_BT_NAME,
                        ""
                    )
                );
                response.put(
                    "mode",
                    printerPreferences.getString(
                        PREF_PRINTER_MODE,
                        MODE_AUTO
                    )
                );

            } catch (JSONException ignored) {

            }

            return response.toString();

        }

        @JavascriptInterface
        public void printText(
            String text
        ) {

            handlePrintPayload(
                "{\"title\":\"Print\",\"text\":"
                    + JSONObject.quote(
                        text == null ? "" : text
                    )
                    + "}"
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
