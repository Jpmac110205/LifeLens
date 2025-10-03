import { Box, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import ProgressBar from "./components/ProgressBar";
import UploadPanel from "./components/UploadPanel";
import ReportPanel from "./components/ReportPanel";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  const [runAnalysis, setRunAnalysis] = useState(false);
  const [cancerType, setCancerType] = useState("BREAST CANCER");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [gradcamImage, setGradcamImage] = useState<string | null>(null);
  const [hasChatStarted, setHasChatStarted] = useState(false);
  const [reviewedEthics, setReviewedEthics] = useState(false);

  // Debug logs to confirm state flows
  useEffect(() => {
    console.log("App originalImage:", originalImage ? originalImage.substring(0,100) : null);
  }, [originalImage]);

  useEffect(() => {
    console.log("App gradcamImage:", gradcamImage ? gradcamImage.substring(0,100) : null);
  }, [gradcamImage]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: "2.5rem",
        background: `linear-gradient(to bottom, #3a6fb0 0%, #8cc2f7 50%, #3a6fb0 100%)`,
      }}
    >
      <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
        <Header reviewedEthics={() => setReviewedEthics(true)} />

        <Typography
          variant="h6"
          sx={{
            textAlign: "center",
            color: "white",
            fontWeight: "bold",
            mb: 2,
          }}
        >
          AI-Powered Multi-Modal Cancer Detection & Risk Prediction
        </Typography>

        <ProgressBar
          runAnalysis={runAnalysis}
          uploadedImage={uploadedImage}
          hasChatStarted={hasChatStarted}
          ethicsReviewed={reviewedEthics}
        />

        <Box
          sx={{
            display: "flex",
            gap: "2.5rem",
            flexWrap: "wrap",
            alignItems: "stretch",
          }}
        >
          <Box sx={{ flex: 1, minWidth: "375px", display: "flex" }}>
            <UploadPanel
              runAnalysis={runAnalysis}
              setRunAnalysis={setRunAnalysis}
              cancerType={cancerType}
              setCancerType={setCancerType}
              uploadedImage={uploadedImage}
              setUploadedImage={setUploadedImage}
              setOriginalImage={setOriginalImage}
              setGradcamImage={setGradcamImage}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: "375px", display: "flex" }}>
            <ReportPanel
              runAnalysis={runAnalysis}
              originalImage={originalImage ?? undefined}
              gradcamImage={gradcamImage ?? undefined}
            />
          </Box>
        </Box>

        <Box sx={{ height: "2.5rem" }} />

        <ChatPanel
          setHasChatStarted={setHasChatStarted}
          runAnalysis={runAnalysis}
        />

        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 3,
            color: "white",
          }}
        >
          For research and demonstration purposes only. Not a substitute for
          medical advice
        </Typography>
      </Box>
    </Box>
  );
}
