import { useState } from "react";
import type { Analysis } from "../lib/types";
import Icon from "./Icon";
export default function ReportPanel({
  analysis,
  preview,
  loading,
  onExport,
  exported,
}: {
  analysis: Analysis | null;
  preview: string | null;
  loading: boolean;
  onExport: () => void;
  exported: boolean;
}) {
  const [view, setView] = useState<"overlay" | "original">("overlay");
  const [imageError, setImageError] = useState(false);
  const source = view === "overlay" ? analysis?.gradcam_overlay : preview;
  return (
    <section
      className="panel report-panel"
      aria-labelledby="report-title"
      aria-busy={loading}
    >
      <div className="panel-heading">
        <span className="section-icon">
          <Icon name="activity" />
        </span>
        <div>
          <h2 id="report-title">Your analysis, explained</h2>
          <p>See the details behind the prediction.</p>
        </div>
        <span className={`badge ${analysis ? "badge-green" : ""}`}>
          {analysis ? "Complete" : loading ? "Processing" : "Awaiting image"}
        </span>
      </div>
      {analysis ? (
        <div className="results">
          <div className="result-summary">
            <div>
              <span className="eyebrow">MODEL PREDICTION</span>
              <h3>{analysis.diagnosis}</h3>
            </div>
            <span className={`risk-badge risk-${analysis.riskLevel}`}>
              <span className="status-dot" />
              {analysis.riskLevel} model risk
            </span>
          </div>
          <div className="confidence-row">
            <span>Model confidence</span>
            <strong>
              {analysis.certainty_percent.toFixed(2)}
              <small>%</small>
            </strong>
          </div>
          <div className="confidence-track">
            <span style={{ width: `${analysis.certainty_percent}%` }} />
          </div>
          <p className="confidence-note">
            Confidence reflects the model’s output, not your likelihood of
            cancer.
          </p>
          <div className="image-toolbar">
            <span className="field-label">Image insight</span>
            <div className="segmented" aria-label="Image view">
              <button
                aria-pressed={view === "overlay"}
                onClick={() => {
                  setView("overlay");
                  setImageError(false);
                }}
              >
                Attention map
              </button>
              <button
                aria-pressed={view === "original"}
                onClick={() => {
                  setView("original");
                  setImageError(false);
                }}
              >
                Original
              </button>
            </div>
          </div>
          <div className="result-image">
            {source && !imageError ? (
              <img
                src={source}
                alt={
                  view === "overlay"
                    ? "Grad-CAM model attention map"
                    : "Original uploaded image"
                }
                onError={() => setImageError(true)}
              />
            ) : (
              <p>
                {imageError
                  ? "This image could not be displayed."
                  : "No attention map available for this analysis."}
              </p>
            )}
          </div>
          <p className="image-caption">
            <Icon name="info" size={14} />
            Grad-CAM highlights model attention. It does not locate cancer.
          </p>
          <button
            className="button button-secondary export-button"
            onClick={onExport}
          >
            <Icon name="download" size={17} />
            {exported ? "Download report again" : "Download research report"}
            <Icon name="arrow" size={17} />
          </button>
        </div>
      ) : (
        <div className={`report-empty ${loading ? "is-loading" : ""}`}>
          <div className="scan-illustration" aria-hidden="true">
            <div className="scan-orbit orbit-one" />
            <div className="scan-orbit orbit-two" />
            <div className="scan-frame">
              <span className="scan-corner top-left" />
              <span className="scan-corner top-right" />
              <span className="scan-corner bottom-left" />
              <span className="scan-corner bottom-right" />
              <Icon name={loading ? "activity" : "image"} size={43} />
              {loading && <div className="scan-line" />}
            </div>
            <span className="scan-spark">
              <Icon name="spark" size={16} />
            </span>
            <span className="scan-check">
              <Icon name="check" size={13} />
            </span>
          </div>
          <h3>
            {loading
              ? "Looking a little closer…"
              : "Your insights will appear here"}
          </h3>
          <p>
            {loading
              ? "The model is processing your image and generating an attention map. This may take a moment."
              : "Upload an image and run the analysis to explore the model’s prediction and attention map."}
          </p>
          <div className="empty-features">
            <span>
              <Icon name="check" size={14} />
              Classification
            </span>
            <span>
              <Icon name="check" size={14} />
              Confidence
            </span>
            <span>
              <Icon name="check" size={14} />
              Grad-CAM
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
