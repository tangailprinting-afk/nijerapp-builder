package com.webapp.engine;

import android.content.Context;
import android.os.RemoteException;
import android.widget.Toast;

import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterException;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.SunmiPrinterService;
import com.sunmi.peripheral.printer.WoyouConsts;

public class SunmiPrinterHelper {

    private Context context;
    private SunmiPrinterService sunmiPrinterService;
    private boolean printerFound;

    private final InnerPrinterCallback innerPrinterCallback =
        new InnerPrinterCallback() {
            @Override
            public void onConnected(SunmiPrinterService service) {
                sunmiPrinterService = service;
                checkPrinterAvailability(service);
            }

            @Override
            public void onDisconnected() {
                sunmiPrinterService = null;
                printerFound = false;
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
            }
        } catch (InnerPrinterException error) {
            printerFound = false;
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
        }
    }

    public boolean isReady() {
        return sunmiPrinterService != null && printerFound;
    }

    public boolean printText(String content) {
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
            return sunmiPrinterService.printerPaper == 1 ? "58mm" : "80mm";
        } catch (RemoteException error) {
            return "";
        }
    }

    public String getPrinterSerialNo() {
        if (!isReady()) {
            return "";
        }

        try {
            return sunmiPrinterService.printerSerialNo;
        } catch (RemoteException error) {
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
}
