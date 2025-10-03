import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import { useRef, useState } from "react";

type UploadPanelProps = {
  runAnalysis: boolean;
  setRunAnalysis: (val: boolean) => void;
  cancerType: string;
  setCancerType: (val: string) => void;
  uploadedImage: File | null;
  setUploadedImage: (file: File | null) => void;
  setOriginalImage: (img: string | null) => void;
  setGradcamImage: (img: string | null) => void;
};

export default function UploadPanel({
  runAnalysis,
  setRunAnalysis,
  cancerType,
  setCancerType,
  uploadedImage,
  setUploadedImage,
  setOriginalImage,
  setGradcamImage,
}: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  // Convert file to base64 data URL (includes data:image/... prefix)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadedImage(event.target.files[0]);
      console.log("Uploaded file:", event.target.files[0]);
    }
  };

  // Accept whatever backend returns and normalize to a proper data URI
  const normalizeGradcam = (raw: string | undefined | null) => {
    if (!raw) return null;
    if (raw.startsWith("data:image")) return raw;
    // assume PNG if no prefix
    return `data:image/png;base64,${raw}`;
  };

  const getRiskLevel = (prediction: string, confidence: number) => {
    if (prediction === "malignant") {
      if (confidence >= 70) return "High";
      if (confidence >= 40) return "Medium";
      return "Low";
    } else {
      if (confidence >= 70) return "Low";
      if (confidence >= 40) return "Medium";
      return "High";
    }
  };

  const handleRunAnalysis = async () => {
    if (!uploadedImage) return;

    const formData = new FormData();
    formData.append("file", uploadedImage);

    // base64 data URL for original (has prefix)
    const base64Original = await fileToBase64(uploadedImage);

    try {
      const response = await fetch("http://127.0.0.1:8080/predict", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Server response:", result);

      setPrediction(result.diagnosis);
      setConfidence(result.certainty_percent);

      // normalize gradcam and set into App state
      const rawGrad = result.gradcam_overlay ?? result.gradcam_image ?? result.gradcam ?? null;
      const normalizedGrad = normalizeGradcam(rawGrad);
      console.log("Normalized Grad-CAM (start):", normalizedGrad ? normalizedGrad.substring(0,100) : null);

      // send to parent App
      setOriginalImage(base64Original);
      setGradcamImage(normalizedGrad);

      // mark analysis done
      setRunAnalysis(true);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <Box
      style={{
        height: "500px",
        flex: 1,
        backgroundColor: "white",
        borderRadius: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "1.5rem",
      }}
    >
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <Button
        variant="contained"
        sx={{ bgcolor: "#8cc2f7", borderRadius: "20px", mb: 2 }}
        disabled={runAnalysis}
        onClick={() => fileInputRef.current?.click()}
      >
        UPLOAD IMAGES
      </Button>

      {uploadedImage && (
        <Typography variant="body1" sx={{ mb: 2, textAlign: "center" }}>
          Selected File: {uploadedImage.name}
        </Typography>
      )}

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Select
          value={cancerType}
          onChange={(e) => setCancerType(e.target.value)}
          sx={{ borderRadius: "20px" }}
          disabled={runAnalysis}
        >
          <MenuItem value="BREAST CANCER">BREAST CANCER</MenuItem>
          <MenuItem value="MELANOMA">MELANOMA</MenuItem>
        </Select>

        <Button variant="outlined" sx={{ borderRadius: "20px" }} disabled={runAnalysis}>
          {cancerType === "BREAST CANCER" && "HISTOPATHOLOGY SLIDES"}
          {cancerType === "MELANOMA" && "PHYSICAL SKIN IMAGE"}
        </Button>
      </Box>

      <Typography
        sx={{ textAlign: "center", color: "gray", fontSize: "0.7rem", mb: 2 }}
      >
        {cancerType === "BREAST CANCER" && "Please upload histopathology slides."}
        {cancerType === "MELANOMA" && "Please upload physical skin images."}
      </Typography>

      <Button
        variant="contained"
        sx={{ bgcolor: "#8cc2f7", borderRadius: "20px", mb: 3 }}
        onClick={handleRunAnalysis}
        disabled={runAnalysis || !uploadedImage}
      >
        RUN ANALYSIS
      </Button>

      {runAnalysis && prediction && confidence !== null && (
        <>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Risk Level:{" "}
            <span
              style={{
                color:
                  getRiskLevel(prediction, confidence) === "High"
                    ? "red"
                    : getRiskLevel(prediction, confidence) === "Medium"
                    ? "orange"
                    : "green",
                fontWeight: "bold",
              }}
            >
              {getRiskLevel(prediction, confidence)}
            </span>
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            Prediction:{" "}
            <span
              style={{
                color: prediction === "malignant" ? "red" : "green",
                fontWeight: "bold",
              }}
            >
              {prediction.toUpperCase()}
            </span>
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            Confidence: <b>{confidence}%</b>
          </Typography>
        </>
      )}
    </Box>
  );
}
