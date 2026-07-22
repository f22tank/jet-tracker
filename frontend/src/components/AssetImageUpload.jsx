import { useRef, useState } from "react";

/** Click-to-upload image slot shared by operator logo and location cover photo —
 * both are entity-page uploads (never the tray), and both support replace/remove. */
export default function AssetImageUpload({ src, onUpload, onRemove, className = "", alt = "", placeholder = "+" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(e) {
    e.stopPropagation();
    setBusy(true);
    setError(null);
    try {
      await onRemove();
    } catch (err) {
      setError(err.message || "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`asset-upload ${className}${busy ? " busy" : ""}`} onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {src ? <img src={src} alt={alt} /> : <div className="asset-upload-empty">{placeholder}</div>}
      <div className="asset-upload-overlay mono">{src ? "Replace" : "Upload"}</div>
      {src && onRemove && (
        <button type="button" className="asset-upload-remove" onClick={handleRemove} title="Remove">
          ×
        </button>
      )}
      {error && <div className="asset-upload-error mono">{error}</div>}
    </div>
  );
}
