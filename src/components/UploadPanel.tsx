import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import { useRef, useState } from "react";

export default function UploadPanel({
  runAnalysis,
  setRunAnalysis,
  cancerType,
  setCancerType,
  uploadedImage,
  setUploadedImage,
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: store results from backend
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  // File change handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadedImage(event.target.files[0]);
      console.log("Uploaded file:", event.target.files[0]);
    }
  };

  const getRiskLevel = (prediction: string, confidence: number) => {
  if (prediction === "malignant") {
    if (confidence >= 70) return "High";
    if (confidence >= 40) return "Medium";
    return "Low";
  } else { // benign
    if (confidence >= 70) return "Low";
    if (confidence >= 40) return "Medium";
    return "High";
  }
};


  // Run analysis handler
  const handleRunAnalysis = async () => {
  if (!uploadedImage) return;

  const formData = new FormData();
  formData.append("file", uploadedImage);

  try {
const response = await fetch("http://127.0.0.1:8080/predict", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log("Server response:", result);

    setPrediction(result.diagnosis);
    setConfidence(result.certainty_percent);
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
      {/* Hidden input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Upload button */}
      <Button
        variant="contained"
        sx={{ bgcolor: "#8cc2f7", borderRadius: "20px", mb: 2 }}
        disabled={runAnalysis}
        onClick={() => fileInputRef.current?.click()}
      >
        UPLOAD IMAGES
      </Button>

      {/* File name */}
      {uploadedImage && (
        <Typography variant="body1" sx={{ mb: 2, textAlign: "center" }}>
          Selected File: {uploadedImage.name}
        </Typography>
      )}

      {/* Dropdown */}
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

        <Button
          variant="outlined"
          sx={{ borderRadius: "20px" }}
          disabled={runAnalysis}
        >
          {cancerType === "BREAST CANCER" && "HISTOPATHOLOGY SLIDES"}
          {cancerType === "MELANOMA" && "PHYSICAL SKIN IMAGE"}
        </Button>
      </Box>

      {/* Helper text */}
      <Typography
        sx={{ textAlign: "center", color: "gray", fontSize: "0.7rem", mb: 2 }}
      >
        {cancerType === "BREAST CANCER" &&
          "Please upload histopathology slides."}
        {cancerType === "MELANOMA" && "Please upload physical skin images."}
      </Typography>

      {/* Run analysis */}
      <Button
        variant="contained"
        sx={{ bgcolor: "#8cc2f7", borderRadius: "20px", mb: 3 }}
        onClick={handleRunAnalysis}
        disabled={runAnalysis || !uploadedImage}
      >
        RUN ANALYSIS
      </Button>

      {/* Show results from backend */}
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

        <Button
          variant="contained"
          sx={{ bgcolor: "#8cc2f7", borderRadius: "20px" }}
        >
          DOWNLOAD REPORT
        </Button>
      </>
    )}
    </Box>
  );
}
