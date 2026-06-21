const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const database = require("./database");

const CONFIG_FILE = path.join(app.getPath("userData"), "config.json");

function createWindow(page) {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });
    win.loadFile(page);
}

app.whenReady().then(() => {
    if (fs.existsSync(CONFIG_FILE)) {
        createWindow("index.html");
    } else {
        createWindow("setup.html");
    }
});

// ============================================
// CREATE DATABASE
// ============================================
ipcMain.handle("create-database", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });

    if (result.canceled) return "Cancelled";

    const folder = result.filePaths[0];
    const dbPath = path.join(folder, "sultandigitalsign.db");
    const db = new sqlite3.Database(dbPath);
    db.close();

    database.saveConfig({ databasePath: dbPath });
    return "Database Created:\n" + dbPath;
});

// ============================================
// CONNECT EXISTING DATABASE
// ============================================
ipcMain.handle("connect-database", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Database Files", extensions: ["db", "sqlite", "sqlite3"] }]
    });

    if (result.canceled) return "Cancelled";

    const filePath = result.filePaths[0];

    try {
        const db = new sqlite3.Database(filePath);
        const isValid = await new Promise((resolve) => {
            db.get("SELECT name FROM sqlite_master WHERE type='table'", [], (err, row) => {
                resolve(!err && row);
            });
        });
        db.close();

        if (!isValid) return "Invalid: Not a valid database file";

        database.saveConfig({ databasePath: filePath });
        return "Connected Successfully:\n" + filePath;
    } catch (error) {
        return "Error: " + error.message;
    }
});

// ============================================
// GET CONFIG
// ============================================
ipcMain.handle("get-config", async () => {
    try {
        return database.getConfig();
    } catch (error) {
        return null;
    }
});

// ============================================
// LOAD EXISTING DATABASE
// ============================================
ipcMain.handle("load-existing-database", async () => {
    try {
        const config = database.getConfig();
        if (config && config.databasePath && fs.existsSync(config.databasePath)) {
            const db = new sqlite3.Database(config.databasePath);
            const isValid = await new Promise((resolve) => {
                db.get("SELECT name FROM sqlite_master WHERE type='table'", [], (err, row) => {
                    resolve(!err && row);
                });
            });
            db.close();
            if (isValid) return { success: true };
        }
        return { success: false, error: "No valid database found" };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// SAVE DATA
// ============================================
ipcMain.handle("save-data", async (event, collection, data) => {
    try {
        const id = await database.save(collection, data);
        return { success: true, id: id };
    } catch (error) {
        return { success: false, error: error.message || error };
    }
});

// ============================================
// GET DATA
// ============================================
ipcMain.handle("get-data", async (event, collection) => {
    try {
        const data = await database.get(collection);
        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: error.message || error };
    }
});

// ============================================
// UPDATE DATA
// ============================================
ipcMain.handle("update-data", async (event, collection, id, data) => {
    try {
        await database.update(collection, id, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message || error };
    }
});

// ============================================
// DELETE DATA
// ============================================
ipcMain.handle("delete-data", async (event, collection, id) => {
    try {
        await database.remove(collection, id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message || error };
    }
});

// ============================================
// COUNT DATA
// ============================================
ipcMain.handle("count-data", async (event, collection) => {
    try {
        const total = await database.count(collection);
        return { success: true, total: total };
    } catch (error) {
        return { success: false, error: error.message || error };
    }
});

// ============================================
// SEARCH DATA
// ============================================
ipcMain.handle("search-data", async (event, collection, keyword) => {
    try {
        const data = await database.search(collection, keyword);
        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: error.message || error };
    }
});