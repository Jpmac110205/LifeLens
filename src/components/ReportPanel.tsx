import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";

type ReportPanelProps = {
  runAnalysis: boolean;
  originalImage?: string;  // data URI expected
  gradcamImage?: string;   // data URI expected (or raw base64)
};

export default function ReportPanel({
  runAnalysis,
  originalImage,
  gradcamImage,
}: ReportPanelProps) {
  const [imgError1, setImgError1] = useState(false);
  const [imgError2, setImgError2] = useState(false);

  // make sure any raw base64 is converted to data URI
  const normalize = (img?: string) => {
    if (!img) return undefined;
    if (img.startsWith("data:image")) return img;
    return `data:image/png;base64,${img}`;
  };

  const normOriginal = normalize(originalImage);
  const normGrad = normalize(gradcamImage);

  // debug logs
  useEffect(() => {
    console.log("ReportPanel received originalImage:", normOriginal ? normOriginal.substring(0,100) : null);
    console.log("ReportPanel received gradcamImage:", normGrad ? normGrad.substring(0,100) : null);
  }, [normOriginal, normGrad]);

  const fallback = "https://via.placeholder.com/250?text=Image+not+available";

  return (
    <Box
      sx={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: "40px",
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
        gap: "1rem",
        minWidth: "300px",
      }}
    >
      {runAnalysis ? (
        <>
          <Typography variant="body1" sx={{ textAlign: "center" }}>
            {normGrad ? "Grad-CAM highlights regions influencing the prediction." : "Results ready — grad-cam not available."}
          </Typography>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Original Image</Typography>
              <img
                src={imgError1 ? fallback : (normOriginal ?? fallback)}
                alt="Original Scan"
                height={200}
                width={200}
                style={{ borderRadius: "10px", maxWidth: "250px", height: "auto", border: "2px solid #e0e0e0" }}
                onError={() => setImgError1(true)}
              />
            </Box>

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Grad-CAM Heatmap</Typography>
              <img
                src={imgError2 ? fallback : (normGrad ?? fallback)}
                height={200}
                width={200}
                alt="Grad-CAM Overlay"
                style={{ borderRadius: "10px", maxWidth: "250px", height: "auto", border: "2px solid #e0e0e0" }}
                onError={() => setImgError2(true)}
              />
            </Box>
          </Box>
        </>
      ) : (
        <Typography variant="body1" sx={{ textAlign: "center", color: "gray" }}>
          Upload an image and run analysis to see results here.
        </Typography>
      )}
    </Box>
  );
}
