# Android SQLite Bridge Contract

Your Android wrapper must expose one of these objects to the WebView page:

- `window.frameworkAPI`
- `window.sqliteBridge`
- `window.AndroidSQLiteBridge`
- `window.NativeSQLiteBridge`

Each object should provide these async methods:

- `createDatabase()`
- `connectDatabase()`
- `getConfig()`
- `loadExistingDatabase()`
- `saveData(collection, data)`
- `getData(collection)`
- `updateData(collection, id, data)`
- `deleteData(collection, id)`
- `countData(collection)`
- `searchData(collection, keyword)`

Expected return shapes:

- `saveData`: `{ success: true, id }`
- `getData`: `{ success: true, data: [] }`
- `updateData`: `{ success: true }`
- `deleteData`: `{ success: true }`
- `countData`: `{ success: true, total }`
- `searchData`: `{ success: true, data: [] }`
- `getConfig`: object or `null`
- `loadExistingDatabase`: `{ success: true }` or `{ success: false, error }`

Recommended SQLite behavior:

- Store each collection in its own table.
- Use `id INTEGER PRIMARY KEY AUTOINCREMENT`.
- Store row payloads as JSON in a `data` column.
- Keep a `created_at` column.

Suggested SQL pattern:

```sql
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

The project-side `FrameworkDB` helper already talks to this contract.

# Android Print Bridge Contract

For SUNMI V2S and other Android WebView wrappers, expose one of these objects:

- `window.NativePrintBridge`
- `window.AndroidPrintBridge`
- `window.NativePrintAPI`
- `window.sunmiPrinter`
- `window.SUNMIPrinter`

Recommended async print methods:

- `printThermalReceipt(payload)`
- `printReceiptHtml(payload)`
- `printThermalHtml(payload)`
- `printHtml(payload)`
- `printHTML(payload)`
- `printReceipt(payload)`
- `print(payload)`

Recommended payload fields:

- `html`
- `content`
- `receiptHtml`
- `rawHtml`
- `title`
- `mode`
- `paperWidthMm`
- `autoCut`
- `copies`

The web app will try these method names in order and fall back to browser print only when no native bridge exists.
