import { useRef } from "react";

export default function FileDropzone({ file, onFileSelect, error }) {
  const fileInputRef = useRef(null);

  const handlePick = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      onFileSelect(null, "Only PDF files are allowed.");
      return;
    }
    onFileSelect(selectedFile, "");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handlePick(event.dataTransfer.files?.[0]);
  };

  return (
    <div
      className="dropzone"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => handlePick(e.target.files?.[0])}
      />
      <p>{file ? `Selected: ${file.name}` : "Drag & drop a PDF here or click to upload"}</p>
      {error ? <small className="error-text">{error}</small> : null}
    </div>
  );
}
