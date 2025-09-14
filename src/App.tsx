import { Box, Typography } from "@mui/material";
import { useState } from "react";
import Header from "./components/Header";
import ProgressBar from "./components/ProgressBar";
import UploadPanel from "./components/UploadPanel";
import ReportPanel from "./components/ReportPanel";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  const [runAnalysis, setRunAnalysis] = useState(false);
  const [cancerType, setCancerType] = useState("BREAST CANCER");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [hasChatStarted, setHasChatStarted] = useState(false);
  const [reviewedEthics, setReviewedEthics] = useState(false);

  return (
<div
  style={{
    minHeight: "100vh",
    padding: "2.5rem",
background: `linear-gradient(to bottom, #3a6fb0 0%, #8cc2f7 50%, #3a6fb0 100%)`,
  }}
>
      <Header reviewedEthics={() => setReviewedEthics(true)} />

      <Typography
        variant="h6"
        sx={{ textAlign: "center", color: "white", fontWeight: "bold", mb: 2 }}
      >
        AI-Powered Multi-Modal Cancer Detection & Risk Prediction
      </Typography>

<ProgressBar
  runAnalysis={runAnalysis}
  uploadedImage={uploadedImage}
  hasChatStarted={hasChatStarted}
  ethicsReviewed={reviewedEthics}
/>

      {/* Row with Upload + Report */}
      <div style={{ display: "flex", gap: "2.5rem" }}>
        <UploadPanel
          runAnalysis={runAnalysis}
          setRunAnalysis={setRunAnalysis}
          cancerType={cancerType}
          setCancerType={setCancerType}
          uploadedImage={uploadedImage}
          setUploadedImage={setUploadedImage}
        />
        <ReportPanel runAnalysis={runAnalysis} />
      </div>

      <div style={{ height: "2.5rem" }}></div>
<ChatPanel setHasChatStarted={setHasChatStarted} runAnalysis={runAnalysis} />

      {/* Footer Disclaimer */}
      <Typography
        variant="caption"
        sx={{ display: "block", textAlign: "center", mt: 3, color: "white" }}
      >
        For research and demonstration purposes only. Not a substitute for medical advice
      </Typography>
    </div>
  );
}
