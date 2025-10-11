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
  const [riskLevel, setRiskLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleCancerTypeChange = async (newType: string) => {
    setCancerType(newType);
    
    // Send cancer type to backend so AI knows what to expect
    try {
      await fetch("http://127.0.0.1:8000/set-cancer-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancerType: newType }),
      });
      console.log("Cancer type set on backend:", newType);
    } catch (error) {
      console.error("Error setting cancer type:", error);
    }
  };

  const normalizeGradcam = (raw: string | undefined | null) => {
    if (!raw) return null;
    if (raw.startsWith("data:image")) return raw;
    return `data:image/png;base64,${raw}`;
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      case "low":
        return "green";
      default:
        return "gray";
    }
  };

  const handleRunAnalysis = async () => {
    if (!uploadedImage) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", uploadedImage);

    // Convert to base64 for display
    const base64Original = await fileToBase64(uploadedImage);

    try {
      // Step 1: Run prediction on backend
      const response = await fetch("http://127.0.0.1:8080/predict", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Prediction response:", result);

      // Update local state with results
      setPrediction(result.diagnosis);
      setConfidence(result.certainty_percent);
      setRiskLevel(result.riskLevel);

      // Normalize gradcam
      const rawGrad = result.gradcam_overlay ?? result.gradcam_image ?? null;
      const normalizedGrad = normalizeGradcam(rawGrad);

      // Send to parent App component
      setOriginalImage(base64Original);
      setGradcamImage(normalizedGrad);

      // Mark analysis complete
      setRunAnalysis(true);
      
      console.log("Analysis complete! Ready for chat.");
    } catch (error) {
      console.error("Error running analysis:", error);
      alert("Error running analysis. Check console for details.");
    } finally {
      setLoading(false);
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
          onChange={(e) => handleCancerTypeChange(e.target.value)}
          sx={{ borderRadius: "20px" }}
          disabled={runAnalysis}
        >
          <MenuItem value="breast cancer">BREAST CANCER</MenuItem>
          <MenuItem value="melanoma">MELANOMA</MenuItem>
        </Select>

        <Button variant="outlined" sx={{ borderRadius: "20px" }} disabled>
          {cancerType === "breast cancer" && "HISTOPATHOLOGY SLIDES"}
          {cancerType === "melanoma" && "PHYSICAL SKIN IMAGE"}
        </Button>
      </Box>

      <Typography
        sx={{ textAlign: "center", color: "gray", fontSize: "0.7rem", mb: 2 }}
      >
        {cancerType === "breast cancer" && "Please upload histopathology slides."}
        {cancerType === "melanoma" && "Please upload physical skin images."}
      </Typography>

      <Button
        variant="contained"
        sx={{ bgcolor: "#8cc2f7", borderRadius: "20px", mb: 3 }}
        onClick={handleRunAnalysis}
        disabled={runAnalysis || !uploadedImage || loading}
      >
        {loading ? "ANALYZING..." : "RUN ANALYSIS"}
      </Button>

      {runAnalysis && prediction && confidence !== null && riskLevel && (
        <>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Risk Level:{" "}
            <span
              style={{
                color: getRiskLevelColor(riskLevel),
                fontWeight: "bold",
              }}
            >
              {riskLevel.toUpperCase()}
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