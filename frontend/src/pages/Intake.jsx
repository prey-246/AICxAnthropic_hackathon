import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import FileDropzone from "../components/FileDropzone";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import "../styles/intake.css";

const OPPORTUNITY_OPTIONS = ["Scholarship", "Internship", "Fellowship"];

const defaultForm = {
  name: "",
  college: "",
  cgpa: "",
  field_of_study: "",
  financial_background: "Under 2.5LPA",
  target_opportunities: []
};

export default function Intake() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState(null);

  const updateField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const toggleTargetOpportunity = (value) => {
    setForm((prev) => {
      const has = prev.target_opportunities.includes(value);
      return {
        ...prev,
        target_opportunities: has
          ? prev.target_opportunities.filter((v) => v !== value)
          : [...prev.target_opportunities, value]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload a PDF before submitting.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      Object.entries(form).forEach(([key, value]) => {
        data.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
      });
      const response = await client.post("/extract-profile", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const extracted = response.data?.profile || response.data || {};
      setExtractedProfile({ ...form, ...extracted });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to extract profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const profileToSave = extractedProfile || form;
    localStorage.setItem("userProfile", JSON.stringify(profileToSave));
    navigate("/opportunities");
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>OpportunityAI Intake</h1>
        <p>Upload your profile and goals to unlock personalized opportunities.</p>
      </div>

      <form className="card intake-form" onSubmit={handleSubmit}>
        <FileDropzone
          file={file}
          error={uploadError}
          onFileSelect={(selectedFile, errMsg) => {
            setFile(selectedFile);
            setUploadError(errMsg);
          }}
        />

        <div className="grid-two">
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="College"
            value={form.college}
            onChange={(e) => updateField("college", e.target.value)}
            required
          />
          <input
            className="input"
            type="number"
            min="0"
            max="10"
            step="0.01"
            placeholder="CGPA (0-10)"
            value={form.cgpa}
            onChange={(e) => updateField("cgpa", e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Field of Study"
            value={form.field_of_study}
            onChange={(e) => updateField("field_of_study", e.target.value)}
            required
          />
          <select
            className="input"
            value={form.financial_background}
            onChange={(e) => updateField("financial_background", e.target.value)}
          >
            <option>Under 2.5LPA</option>
            <option>2.5-5LPA</option>
            <option>5-8LPA</option>
            <option>Above 8LPA</option>
          </select>
        </div>

        <div>
          <label className="label">Target Opportunities</label>
          <div className="multi-select">
            {OPPORTUNITY_OPTIONS.map((option) => (
              <label key={option} className="check-pill">
                <input
                  type="checkbox"
                  checked={form.target_opportunities.includes(option)}
                  onChange={() => toggleTargetOpportunity(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {loading ? <LoadingSpinner label="Extracting profile..." /> : null}
        {error ? <ErrorState message={error} /> : null}

        <button className="btn primary" type="submit" disabled={loading}>
          Submit
        </button>
      </form>

      {extractedProfile ? (
        <div className="card">
          <h2>Extracted Profile Preview</h2>
          <div className="preview-grid">
            {Object.entries(extractedProfile).map(([key, value]) => (
              <div key={key} className="preview-card">
                <label className="label">{key.replace(/_/g, " ")}</label>
                <input
                  className="input"
                  value={Array.isArray(value) ? value.join(", ") : value ?? ""}
                  onChange={(e) => {
                    const nextValue =
                      Array.isArray(value) || key === "target_opportunities"
                        ? e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean)
                        : e.target.value;
                    setExtractedProfile((prev) => ({ ...prev, [key]: nextValue }));
                  }}
                />
              </div>
            ))}
          </div>
          <button className="btn success" type="button" onClick={handleConfirm}>
            Confirm Profile
          </button>
        </div>
      ) : null}
    </div>
  );
}
