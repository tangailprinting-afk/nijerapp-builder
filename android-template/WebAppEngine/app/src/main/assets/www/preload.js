const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("frameworkAPI", {

    // Database Setup
    createDatabase: () => ipcRenderer.invoke("create-database"),
    connectDatabase: () => ipcRenderer.invoke("connect-database"),
    getConfig: () => ipcRenderer.invoke("get-config"),
    loadExistingDatabase: () => ipcRenderer.invoke("load-existing-database"),

    // CRUD Operations
    saveData: (collection, data) => ipcRenderer.invoke("save-data", collection, data),
    getData: (collection) => ipcRenderer.invoke("get-data", collection),
    updateData: (collection, id, data) => ipcRenderer.invoke("update-data", collection, id, data),
    deleteData: (collection, id) => ipcRenderer.invoke("delete-data", collection, id),
    countData: (collection) => ipcRenderer.invoke("count-data", collection),
    searchData: (collection, keyword) => ipcRenderer.invoke("search-data", collection, keyword)

});