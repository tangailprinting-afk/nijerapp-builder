package com.webapp.engine;

import android.content.Context;
import android.os.RemoteException;
import android.widget.Toast;

import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterException;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.SunmiPrinterService;
import com.sunmi.peripheral.printer.WoyouConsts;

import java.lang.reflect.Method;

import org.json.JSONException;
import org.json.JSONObject;

public class SunmiPrinterHelper {

    private Context context;
    private SunmiPrinterService sunmiPrinterService;
    private boolean printerFound;
    private volatile boolean printerConnected;
    private volatile String lastErrorMessage = "";
    private volatile String lastStatusMessage = "Sunmi helper not initialized";

    private final InnerPrinterCallback innerPrinterCallback =
        new InnerPrinterCallback() {
            @Override
            public void onConnected(SunmiPrinterService service) {
                sunmiPrinterService = service;
                printerConnected = true;
                checkPrinterAvailability(service);
                recordStatus(
                    printerFound
                        ? "Sunmi printer service connected and printer detected"
                        : "Sunmi printer service connected"
                );
            }

            @Override
            public void onDisconnected() {
                sunmiPrinterService = null;
                printerFound = false;
                printerConnected = false;
                recordStatus("Sunmi printer service disconnected");
            }
        };

    public void initSunmiPrinterService(Context context) {
        this.context = context;
        try {
            boolean bound =
                InnerPrinterManager.getInstance().bindService(
                    context,
                    innerPrinterCallback
                );
            if (!bound) {
                printerFound = false;
                printerConnected = false;
                recordError("Sunmi bindService returned false");
            }
        } catch (InnerPrinterException error) {
            printerFound = false;
            printerConnected = false;
            recordError("Sunmi bind failed: " + error.getMessage());
        }
    }

    public void deInitSunmiPrinterService(Context context) {
        try {
            if (sunmiPrinterService != null) {
                InnerPrinterManager.getInstance().unBindService(
                    context,
                    innerPrinterCallback
                );
            }
        } catch (InnerPrinterException ignored) {
        } finally {
            sunmiPrinterService = null;
            printerFound = false;
            printerConnected = false;
            recordStatus("Sunmi printer service released");
        }
    }

    public boolean isReady() {
        return sunmiPrinterService != null && printerConnected;
    }

    public boolean isServiceBound() {
        return sunmiPrinterService != null;
    }

    public boolean isPrinterConnected() {
        return printerConnected;
    }

    public boolean isPrinterFound() {
        return printerFound;
    }

    public String getLastErrorMessage() {
        return lastErrorMessage == null ? "" : lastErrorMessage;
    }

    public String getLastStatusMessage() {
        return lastStatusMessage == null ? "" : lastStatusMessage;
    }

    public String getDebugStateJson() {
        JSONObject state = new JSONObject();
        try {
            state.put("ready", isReady());
            state.put("serviceBound", isServiceBound());
            state.put("serviceConnected", isPrinterConnected());
            state.put("printerFound", isPrinterFound());
            state.put("lastError", getLastErrorMessage());
            state.put("lastStatus", getLastStatusMessage());
            state.put("paperLabel", getPrinterPaperLabel());
            state.put("serialNo", getPrinterSerialNo());
        } catch (JSONException error) {
            return "{}";
        }
        return state.toString();
    }

    public boolean printText(String content) {
        if (!isReady()) {
            if (context != null) {
                initSunmiPrinterService(context);
                if (!waitForReady(8000L)) {
                    recordError("Sunmi printer did not become ready within 8000ms");
                    return false;
                }
            }
        }

        if (!isReady()) {
            recordError("Sunmi printer is not ready");
            return false;
        }

        try {
            sunmiPrinterService.printerInit(null);
            sunmiPrinterService.setPrinterStyle(
                WoyouConsts.ENABLE_BOLD,
                WoyouConsts.DISABLE
            );
            sunmiPrinterService.setPrinterStyle(
                WoyouConsts.ENABLE_UNDERLINE,
                WoyouConsts.DISABLE
            );
            sunmiPrinterService.printTextWithFont(
                content,
                "monospace",
                24f,
                null
            );
            sunmiPrinterService.lineWrap(2, null);
            sunmiPrinterService.cutPaper(null);
            recordStatus("Sunmi print job sent");
            return true;
        } catch (RemoteException error) {
            recordError("Sunmi print failed: " + error.getMessage());
            Toast.makeText(
                context,
                "Sunmi print failed: " + error.getMessage(),
                Toast.LENGTH_SHORT
            ).show();
            return false;
        } catch (Throwable error) {
            recordError("Sunmi print error: " + error.getMessage());
            Toast.makeText(
                context,
                "Sunmi print error: " + error.getMessage(),
                Toast.LENGTH_SHORT
            ).show();
            return false;
        }
    }

    public String getPrinterPaperLabel() {
        if (!isReady()) {
            return "";
        }

        try {
            Integer paperCode = invokeIntGetter(
                sunmiPrinterService,
                "getPrinterPaper"
            );
            if (paperCode == null) {
                return "";
            }
            return paperCode == 1 ? "58mm" : "80mm";
        } catch (Throwable error) {
            return "";
        }
    }

    public String getPrinterSerialNo() {
        if (!isReady()) {
            return "";
        }

        try {
            String serial = invokeStringGetter(
                sunmiPrinterService,
                "getPrinterSerialNo"
            );
            return serial == null ? "" : serial;
        } catch (Throwable error) {
            return "";
        }
    }

    private void checkPrinterAvailability(SunmiPrinterService service) {
        try {
            printerFound = InnerPrinterManager.getInstance().hasPrinter(service);
            if (printerFound) {
                recordStatus("Sunmi printer detected");
            } else {
                recordStatus("Sunmi printer service connected but no printer reported");
            }
        } catch (InnerPrinterException error) {
            printerFound = false;
            recordError("Sunmi printer availability check failed: " + error.getMessage());
        }
    }

    private boolean waitForReady(long timeoutMs) {
        long startedAt = System.currentTimeMillis();
        while (
            !isReady()
            && System.currentTimeMillis() - startedAt < timeoutMs
        ) {
            try {
                Thread.sleep(100L);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return isReady();
    }

    private Integer invokeIntGetter(
        Object target,
        String methodName
    ) {
        Object value = invokeGetter(target, methodName);
        if (value instanceof Integer) {
            return (Integer) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return null;
    }

    private String invokeStringGetter(
        Object target,
        String methodName
    ) {
        Object value = invokeGetter(target, methodName);
        return value == null ? null : String.valueOf(value);
    }

    private Object invokeGetter(
        Object target,
        String methodName
    ) {
        if (target == null) {
            return null;
        }
        try {
            Method method =
                target.getClass().getMethod(methodName);
            return method.invoke(target);
        } catch (Throwable error) {
            return null;
        }
    }

    private void recordStatus(String message) {
        lastStatusMessage = message == null ? "" : message;
    }

    private void recordError(String message) {
        String normalized = message == null ? "" : message;
        lastErrorMessage = normalized;
        lastStatusMessage = normalized;
    }
}
