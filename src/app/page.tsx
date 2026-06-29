"use client";

import { useState } from "react";

type FeatureKey =
  | "dashboard"
  | "customers"
  | "sales"
  | "pos"
  | "collections"
  | "expenses"
  | "products"
  | "staff"
  | "suppliers"
  | "reports"
  | "printer";

const FEATURE_OPTIONS: Array<{
  key: FeatureKey;
  label: string;
  description: string;
  defaultEnabled: boolean;
}> = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Overview cards and summaries.",
    defaultEnabled: true,
  },
  {
    key: "customers",
    label: "Customers",
    description: "Customer list and management.",
    defaultEnabled: true,
  },
  {
    key: "sales",
    label: "Sales",
    description: "Sales flows and records.",
    defaultEnabled: true,
  },
  {
    key: "pos",
    label: "POS",
    description: "Point of sale screens.",
    defaultEnabled: true,
  },
  {
    key: "collections",
    label: "Collections",
    description: "Payment collection tools.",
    defaultEnabled: true,
  },
  {
    key: "expenses",
    label: "Expenses",
    description: "Expense tracking module.",
    defaultEnabled: true,
  },
  {
    key: "products",
    label: "Products",
    description: "Product catalog and items.",
    defaultEnabled: true,
  },
  {
    key: "staff",
    label: "Staff",
    description: "Team and permissions screens.",
    defaultEnabled: true,
  },
  {
    key: "suppliers",
    label: "Suppliers",
    description: "Supplier records and tools.",
    defaultEnabled: true,
  },
  {
    key: "reports",
    label: "Reports",
    description: "Reporting and analytics pages.",
    defaultEnabled: true,
  },
  {
    key: "printer",
    label: "Printer",
    description: "Printer settings and native bridge UI.",
    defaultEnabled: false,
  },
];

function createDefaultFeatures() {
  return FEATURE_OPTIONS.reduce<Record<FeatureKey, boolean>>(
    (accumulator, feature) => {
      accumulator[feature.key] = feature.defaultEnabled;
      return accumulator;
    },
    {} as Record<FeatureKey, boolean>,
  );
}

export default function Home() {
  const [appName, setAppName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [icon, setIcon] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [selectedFeatures, setSelectedFeatures] =
    useState<Record<FeatureKey, boolean>>(createDefaultFeatures);

  async function generateAPK() {
    try {
      setStatus("Starting Cloud Build...");

      const formData = new FormData();
      formData.append("appName", appName);
      formData.append("packageName", packageName);
      formData.append("htmlCode", htmlCode);
      formData.append("features", JSON.stringify(selectedFeatures));

      if (zipFile) {
        formData.append("zipFile", zipFile);
      }

      if (icon) {
        formData.append("icon", icon);
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStatus("Cloud Build Started 🚀");

        if (data.runId) {
          const interval = setInterval(async () => {
            const statusResponse = await fetch(
              `/api/status?runId=${data.runId}`,
            );

            const statusData = await statusResponse.json();

            if (statusData.status === "completed") {
              clearInterval(interval);

              if (statusData.conclusion === "success") {
                setStatus("APK Build Success ✅");

                const downloadResponse = await fetch("/api/download");
                const downloadData = await downloadResponse.json();

                if (downloadData.success) {
                  setDownloadUrl(downloadData.url);
                }
              } else {
                setStatus("APK Build Failed ❌");
              }
            }
          }, 5000);
        }
      } else {
        setStatus("Build Failed ❌");
      }
    } catch (error) {
      console.log(error);
      setStatus("Server Error ❌");
    }
  }

  return (
    <main className="container">
      <h1>NijerApp Builder</h1>

      <input
        type="text"
        placeholder="App Name"
        value={appName}
        onChange={(e) => setAppName(e.target.value)}
      />

      <input
        type="text"
        placeholder="Package Name"
        value={packageName}
        onChange={(e) => setPackageName(e.target.value)}
      />

      <textarea
        placeholder="Paste HTML"
        value={htmlCode}
        onChange={(e) => setHtmlCode(e.target.value)}
      />

      <section>
        <h2>App Features</h2>
        <p>Only selected features will be added to the generated app.</p>

        <div className="feature-grid">
          {FEATURE_OPTIONS.map((feature) => (
            <label key={feature.key} className="feature-card">
              <input
                type="checkbox"
                checked={selectedFeatures[feature.key]}
                onChange={(e) =>
                  setSelectedFeatures((current) => ({
                    ...current,
                    [feature.key]: e.target.checked,
                  }))
                }
              />
              <span>{feature.label}</span>
              <small>{feature.description}</small>
            </label>
          ))}
        </div>
      </section>

      <label>Upload ZIP</label>
      <input
        type="file"
        onChange={(e) => setZipFile(e.target.files?.[0] || null)}
      />

      <label>Upload Icon</label>
      <input
        type="file"
        onChange={(e) => setIcon(e.target.files?.[0] || null)}
      />

      <button onClick={generateAPK}>Generate APK</button>

      <p>{status}</p>
      <p>
        In the installed Android app, `window.print()` can be routed to the
        native printer bridge.
      </p>
      <p>
        Deployment sync marker: latest production build should come from the
        current `main` branch.
      </p>

      {downloadUrl && (
        <a href={downloadUrl} target="_blank">
          <button>Download APK</button>
        </a>
      )}
    </main>
  );
}
