import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import ProgressBar from "./components/ProgressBar";
import UploadPanel from "./components/UploadPanel";
import ReportPanel from "./components/ReportPanel";
import ChatPanel from "./components/ChatPanel";
import Modal from "./components/Modal";
import Icon from "./components/Icon";
import { apiRequest, predict } from "./lib/api";
import { downloadReport } from "./lib/report";
import type { Analysis, CancerType, Message } from "./lib/types";
import "./App.css";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cancerType, setCancerType] = useState<CancerType>("breast");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  const [session, setSession] = useState(0);
  const [modal, setModal] = useState<
    "about" | "ethics" | "export" | "reset" | null
  >(null);
  const [consent, setConsent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const request = useRef<AbortController | null>(null);
  const healthRequest = useRef<AbortController | null>(null);
  const selection = useRef(0);
  const checkConnection = useCallback(async () => {
    healthRequest.current?.abort();
    const controller = new AbortController();
    healthRequest.current = controller;
    setStatus("checking");
    try {
      const data = (await apiRequest(
        "/health",
        { signal: controller.signal },
        5000,
      )) as { status?: string };
      if (!controller.signal.aborted)
        setStatus(data.status === "healthy" ? "online" : "offline");
    } catch {
      if (!controller.signal.aborted) setStatus("offline");
    }
  }, []);
  useEffect(() => {
    void checkConnection();
    return () => {
      healthRequest.current?.abort();
      request.current?.abort();
    };
  }, [checkConnection]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const clearResults = () => {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setAnalysis(null);
    setMessages([]);
    setError(null);
    setExported(false);
    setConsent(false);
    setSession((value) => value + 1);
  };
  const reset = () => {
    selection.current++;
    clearResults();
    setFile(null);
    setPreview(null);
    setModal(null);
  };
  const selectFile = async (next: File | null) => {
    const version = ++selection.current;
    if (!next) {
      clearResults();
      setFile(null);
      setPreview(null);
      return;
    }
    if (
      !["image/jpeg", "image/png"].includes(next.type) ||
      !/\.(jpe?g|png)$/i.test(next.name)
    ) {
      setError(
        "Please choose a JPG or PNG image. DICOM and other formats are not supported.",
      );
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("This image is too large. Choose a file under 10 MB.");
      return;
    }
    const url = URL.createObjectURL(next);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.naturalWidth * image.naturalHeight > 25_000_000)
        throw new Error("Choose an image with fewer than 25 million pixels.");
      if (version !== selection.current) {
        URL.revokeObjectURL(url);
        return;
      }
      clearResults();
      setFile(next);
      setPreview(url);
    } catch (cause) {
      URL.revokeObjectURL(url);
      if (version === selection.current)
        setError(
          cause instanceof Error && cause.message.startsWith("Choose")
            ? cause.message
            : "This image could not be read. Please choose a valid JPG or PNG.",
        );
    }
  };
  const analyze = async () => {
    if (!file || loading || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await predict(file, cancerType, controller.signal);
      if (!controller.signal.aborted) {
        setAnalysis(result);
        setStatus("online");
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "The analysis failed. Please try again.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        request.current = null;
      }
    }
  };
  const exportReport = async () => {
    if (!analysis || !file || !consent || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await downloadReport(analysis, file, messages);
      setExported(true);
      setModal(null);
    } catch (cause) {
      setExportError(
        cause instanceof Error
          ? cause.message
          : "Could not download your report.",
      );
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="app-shell">
      <Header
        onAbout={() => setModal("about")}
        onEthics={() => setModal("ethics")}
        onReset={() => setModal("reset")}
        hasSession={!!file || !!error}
        status={status}
        onRetry={() => void checkConnection()}
      />
      <main id="workspace" className="main-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow page-eyebrow">
              <span className="tiny-line" />A NEW PERSPECTIVE ON IMAGE ANALYSIS
            </div>
            <h1>
              A clearer view.
              <br />
              <span>A more informed next step.</span>
            </h1>
            <p>
              Explore your images with AI. Understand the insights, one step at
              a time.
            </p>
          </div>
          <div className="edition-label">
            <Icon name="lens" size={18} />
            <span>
              RESEARCH
              <br />
              <strong>WORKSPACE</strong>
            </span>
          </div>
        </div>
        <div className="research-banner">
          <span className="banner-icon">
            <Icon name="shield" size={19} />
          </span>
          <p>
            <strong>Research with perspective.</strong> LifeLens is an
            educational tool. Its results are not a medical diagnosis.
          </p>
          <button onClick={() => setModal("ethics")}>
            Our approach
            <Icon name="arrow" size={15} />
          </button>
        </div>
        <ProgressBar
          hasFile={!!file}
          hasResult={!!analysis}
          hasChat={messages.some((message) => message.role === "assistant")}
          exported={exported}
          loading={loading}
        />
        <div className="analysis-grid">
          <UploadPanel
            file={file}
            preview={preview}
            cancerType={cancerType}
            loading={loading}
            hasResult={!!analysis}
            error={error}
            onFile={(next) => void selectFile(next)}
            onType={(type) => {
              selection.current++;
              clearResults();
              setCancerType(type);
            }}
            onAnalyze={() => void analyze()}
            onCancel={clearResults}
          />
          <ReportPanel
            key={session}
            analysis={analysis}
            preview={preview}
            loading={loading}
            exported={exported}
            onExport={() => {
              setConsent(false);
              setExportError(null);
              setModal("export");
            }}
          />
        </div>
        <ChatPanel
          key={session}
          analysis={analysis}
          messages={messages}
          onMessages={setMessages}
        />
        <footer className="page-footer">
          <span>
            <Icon name="lens" size={16} />
            Made for curiosity. Designed with care.
          </span>
          <span>LifeLens · Research & education only</span>
        </footer>
      </main>
      {modal === "about" && (
        <Modal title="A closer look at LifeLens" onClose={() => setModal(null)}>
          <p>
            LifeLens is an independent research project exploring image
            classification, Grad-CAM explainability, and conversational AI.
          </p>
          <div className="modal-note">
            <Icon name="lens" size={24} />
            <p>
              Two research models: breast histopathology and melanoma skin
              images. Model outputs have not been validated for clinical use.
            </p>
          </div>
          <h3>Dataset credits</h3>
          <ul className="resource-list">
            <li>
              <a
                href="https://www.kaggle.com/datasets/hasnainjaved/melanoma-skin-cancer-dataset-of-10000-images"
                target="_blank"
                rel="noreferrer"
              >
                Melanoma skin cancer dataset
                <Icon name="external" size={14} />
              </a>
            </li>
            <li>
              <a
                href="https://www.kaggle.com/datasets/obulisainaren/multi-cancer"
                target="_blank"
                rel="noreferrer"
              >
                Multi-cancer dataset
                <Icon name="external" size={14} />
              </a>
            </li>
            <li>
              <a
                href="https://www.kaggle.com/datasets/ambarish/breakhis"
                target="_blank"
                rel="noreferrer"
              >
                BreakHis breast histopathology
                <Icon name="external" size={14} />
              </a>
            </li>
          </ul>
          <button
            className="button button-primary"
            onClick={() => setModal(null)}
          >
            Back to workspace
            <Icon name="arrow" size={17} />
          </button>
        </Modal>
      )}
      {modal === "ethics" && (
        <Modal
          title="Research with responsibility"
          onClose={() => setModal(null)}
        >
          <p>
            LifeLens supports exploration and learning. It is not a substitute
            for professional medical advice, diagnosis, or treatment.
          </p>
          <ul className="ethics-list">
            <li>
              <Icon name="activity" />
              <div>
                <strong>Understand the limits</strong>
                <p>
                  Model confidence is not the probability of having cancer. The
                  risk indicator is a model-based heuristic, not a clinical risk
                  assessment.
                </p>
              </div>
            </li>
            <li>
              <Icon name="image" />
              <div>
                <strong>Attention is not a diagnosis</strong>
                <p>
                  Grad-CAM shows areas that influenced a prediction. It cannot
                  confirm cancer or identify its location.
                </p>
              </div>
            </li>
            <li>
              <Icon name="shield" />
              <div>
                <strong>Keep your data in your control</strong>
                <p>
                  Images and conversations are held for this browser session
                  without database storage. Chat sends your questions, prior
                  messages, and model results to OpenAI; images are not included
                  in chat requests. Use anonymized research data.
                </p>
              </div>
            </li>
            <li>
              <Icon name="heart" />
              <div>
                <strong>Bring medical questions to a professional</strong>
                <p>
                  Discuss health concerns with a qualified healthcare provider.
                </p>
              </div>
            </li>
          </ul>
          <a
            className="button button-secondary"
            href="https://www.unesco.org/en/artificial-intelligence/recommendation-ethics"
            target="_blank"
            rel="noreferrer"
          >
            UNESCO ethics of AI
            <Icon name="external" size={16} />
          </a>
        </Modal>
      )}
      {modal === "export" && (
        <Modal
          title="Save your research report"
          onClose={() => {
            if (!exporting) setModal(null);
          }}
        >
          <p>
            Your report includes the model results, original image, attention
            map, and this conversation. It downloads as an HTML file you can
            open in a browser or print to PDF.
          </p>
          <div className="modal-note">
            <Icon name="info" size={22} />
            <p>
              This report is for research purposes only and should not be used
              for medical diagnosis or treatment. Please consult a qualified
              healthcare provider.
            </p>
          </div>
          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={consent}
              disabled={exporting}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              I understand the research limitations and agree to save a copy of
              this session on my device.
            </span>
          </label>
          {exportError && (
            <p className="inline-error" role="alert">
              {exportError}
            </p>
          )}
          <button
            className="button button-primary"
            disabled={!consent || exporting}
            onClick={() => void exportReport()}
          >
            <Icon name="download" size={17} />
            {exporting ? "Preparing your report…" : "Download report"}
          </button>
        </Modal>
      )}
      {modal === "reset" && (
        <Modal title="Start a new analysis?" onClose={() => setModal(null)}>
          <p>
            This clears your image, results, and conversation from the
            workspace. Download a research report first if you want to keep a
            copy.
          </p>
          <div className="modal-actions">
            <button
              className="button button-secondary"
              onClick={() => setModal(null)}
            >
              Keep this session
            </button>
            <button className="button button-primary" onClick={reset}>
              <Icon name="reset" size={17} />
              Start fresh
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
