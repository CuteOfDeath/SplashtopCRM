import { useState, useRef, type ChangeEvent, type CSSProperties, type FormEvent } from "react";

// Point this at wherever import_csv_endpoint.php is served from
const IMPORT_ENDPOINT = "//127.0.0.1/CRM/api/import_csv_endpoint.php";

type Status = "idle" | "uploading" | "success" | "error";

interface ImportSuccessResponse {
  success: true;
  table: string;
  row_count: number;
  columns: Record<string, string>;
}

interface ImportErrorResponse {
  success: false;
  error: string;
}

type ImportResponse = ImportSuccessResponse | ImportErrorResponse;

export default function CsvImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportSuccessResponse | null>(null);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setStatus("idle");
    setResult(null);
    setError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    const formData = new FormData();
    formData.append("csv_file", file);

    setStatus("uploading");
    setError("");

    try {
      const res = await fetch(IMPORT_ENDPOINT, {
        method: "POST",
        body: formData, // browser sets multipart/form-data + boundary automatically
      });

      const data: ImportResponse = await res.json();

      if (!res.ok || !data.success) {
        const message = !data.success ? data.error : `Upload failed (${res.status})`;
        throw new Error(message);
      }

      setResult(data);
      setStatus("success");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during upload.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <label style={styles.label} htmlFor="csv-input">
        CSV file
      </label>
      <input
        id="csv-input"
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        style={styles.fileInput}
      />

      <button
        type="submit"
        disabled={!file || status === "uploading"}
        style={{
          ...styles.button,
          opacity: !file || status === "uploading" ? 0.6 : 1,
        }}
      >
        {status === "uploading" ? "Importing…" : "Import CSV"}
      </button>

      {status === "error" && <p style={styles.errorText}>{error}</p>}

      {status === "success" && result && (
        <div style={styles.successBox}>
          <p style={styles.successTitle}>
            Imported {result.row_count} row{result.row_count === 1 ? "" : "s"} into{" "}
            <code>{result.table}</code>
          </p>
          <ul style={styles.columnList}>
            {Object.entries(result.columns).map(([col, type]) => (
              <li key={col}>
                <code>{col}</code> — {type}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

const styles: Record<string, CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    maxWidth: 360,
    fontFamily: "system-ui, sans-serif",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 600,
  },
  fileInput: {
    fontSize: "0.875rem",
  },
  button: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    width: "fit-content",
  },
  errorText: {
    color: "#dc2626",
    fontSize: "0.875rem",
    margin: 0,
  },
  successBox: {
    border: "1px solid #d1fae5",
    backgroundColor: "#ecfdf5",
    borderRadius: 6,
    padding: "0.75rem",
  },
  successTitle: {
    margin: "0 0 0.5rem 0",
    fontSize: "0.875rem",
  },
  columnList: {
    margin: 0,
    paddingLeft: "1.1rem",
    fontSize: "0.8rem",
    color: "#374151",
  },
};
