import { useRef, useState } from "react";
import type { CancerType } from "../lib/types";
import Icon from "./Icon";
export default function UploadPanel({
  file,
  preview,
  cancerType,
  loading,
  hasResult,
  error,
  onFile,
  onType,
  onAnalyze,
  onCancel,
}: {
  file: File | null;
  preview: string | null;
  cancerType: CancerType;
  loading: boolean;
  hasResult: boolean;
  error: string | null;
  onFile: (file: File | null) => void;
  onType: (type: CancerType) => void;
  onAnalyze: () => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <section className="panel upload-panel" aria-labelledby="upload-title">
      <div className="panel-heading">
        <span className="section-icon">
          <Icon name="upload" />
        </span>
        <div>
          <h2 id="upload-title">Start with an image</h2>
          <p>A little input. A new perspective.</p>
        </div>
        <span className="panel-index">01</span>
      </div>
      <label className="field-label" htmlFor="cancer-type">
        Analysis model <span>Required</span>
      </label>
      <div className="select-wrap">
        <select
          id="cancer-type"
          value={cancerType}
          disabled={loading}
          onChange={(event) => onType(event.target.value as CancerType)}
        >
          <option value="breast">Breast cancer</option>
          <option value="melanoma">Melanoma</option>
        </select>
        <Icon name="activity" size={18} />
      </div>
      <p className="field-hint">
        {cancerType === "breast"
          ? "For histopathology slide images."
          : "For close-up skin images."}
      </p>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        tabIndex={-1}
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        disabled={loading}
        aria-label="Upload research image"
        onChange={(event) => {
          if (event.target.files?.[0]) onFile(event.target.files[0]);
          event.target.value = "";
        }}
      />
      <div
        className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!loading && event.dataTransfer.files[0])
            onFile(event.dataTransfer.files[0]);
        }}
      >
        {file && preview ? (
          <>
            <div className="preview-wrap">
              <img src={preview} alt="Preview of selected research image" />
              <button
                className="preview-remove icon-button"
                disabled={loading}
                onClick={() => onFile(null)}
                aria-label="Remove image"
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <div className="selected-file">
              <Icon name="file" size={18} />
              <div>
                <strong title={file.name}>{file.name}</strong>
                <small>
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze
                </small>
              </div>
              <button
                className="text-button"
                disabled={loading}
                onClick={() => input.current?.click()}
              >
                Change
              </button>
            </div>
          </>
        ) : (
          <button
            className="dropzone-button"
            disabled={loading}
            onClick={() => input.current?.click()}
          >
            <span className="upload-symbol">
              <Icon name="upload" size={25} />
            </span>
            <strong>Drop your image here</strong>
            <span>
              or <b>browse files</b> to upload
            </span>
            <small>JPG or PNG · Up to 10 MB</small>
          </button>
        )}
      </div>
      <div className="privacy-note">
        <Icon name="shield" size={15} />
        <span>Your image is processed for this session. It is not saved.</span>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          <Icon name="info" size={17} />
          {error}
        </div>
      )}
      <button
        className="button button-primary analyze-button"
        disabled={!file || loading || hasResult}
        onClick={onAnalyze}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Analyzing image…
          </>
        ) : hasResult ? (
          <>
            <Icon name="check" size={18} />
            Analysis complete
          </>
        ) : (
          <>
            <Icon name="spark" size={18} />
            Run analysis
            <Icon name="arrow" size={18} />
          </>
        )}
      </button>
      {loading ? (
        <button className="text-button cancel-button" onClick={onCancel}>
          Cancel analysis
        </button>
      ) : (
        <p className="upload-footnote">
          Model output is for research, not a clinical diagnosis.
        </p>
      )}
    </section>
  );
}
