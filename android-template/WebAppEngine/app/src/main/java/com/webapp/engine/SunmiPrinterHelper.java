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

public class SunmiPrinterHelper {

    private Context context;
    private SunmiPrinterService sunmiPrinterService;
    private boolean printerFound;
    private volatile boolean printerConnected;

    private final InnerPrinterCallback innerPrinterCallback =
        new InnerPrinterCallback() {
            @Override
            public void onConnected(SunmiPrinterService service) {
                sunmiPrinterService = service;
                printerConnected = true;
                checkPrinterAvailability(service);
            }

            @Override
            public void onDisconnected() {
                sunmiPrinterService = null;
                printerFound = false;
                printerConnected = false;
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
            }
        } catch (InnerPrinterException error) {
            printerFound = false;
            printerConnected = false;
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
        }
    }

    public boolean isReady() {
        return sunmiPrinterService != null && printerConnected;
    }

    public boolean printText(String content) {
        if (!isReady()) {
            if (context != null) {
                initSunmiPrinterService(context);
                waitForReady(1500L);
            }
        }

        if (!isReady()) {
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
            return true;
        } catch (RemoteException error) {
            Toast.makeText(
                context,
                "Sunmi print failed: " + error.getMessage(),
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
        } catch (InnerPrinterException error) {
            printerFound = false;
        }
    }

    private void waitForReady(long timeoutMs) {
        long startedAt = System.currentTimeMillis();
        while (
            !isReady()
            && System.currentTimeMillis() - startedAt < timeoutMs
        ) {
            try {
                Thread.sleep(100L);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
                return;
            }
        }
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
}
