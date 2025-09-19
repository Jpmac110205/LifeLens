import { Box, Typography } from "@mui/material";
import { useState } from "react";

type ReportPanelProps = { runAnalysis: boolean };

export default function ReportPanel({ runAnalysis }: ReportPanelProps) {
  const [imgError1, setImgError1] = useState(false);
  const [imgError2, setImgError2] = useState(false);

  // ✅ Use direct .jpg/.png URLs
  const image1 =
    "https://c8.alamy.com/comp/2AD0W56/brain-cancer-magnetic-resonance-imaging-mri-scan-of-an-axial-section-through-the-brain-of-a-32-year-old-patient-showing-a-large-haemangiopericytom-2AD0W56.jpg";
  const image2 =
  "https://www.nfcr.org/wp-content/webp-express/webp-images/uploads/2021/02/Research-Highlight-Preventing-Breast-Cancer-Brain-Metastasis-ft.jpg.webp";

  const fallback =
    "https://via.placeholder.com/200?text=Image+not+available";

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
          <Typography variant="body1">
            Cancerous tissue detected in upper left. It is recommended to consult
            with a doctor as soon as possible.
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <img
              src={imgError1 ? fallback : image1}
              alt="scan1"
              style={{
                borderRadius: "10px",
                maxWidth: "45%",
                height: "auto",
                objectFit: "cover",
              }}
              onError={() => setImgError1(true)}
            />
            <img
              src={imgError2 ? fallback : image2}
              alt="scan2"
              style={{
                borderRadius: "10px",
                maxWidth: "45%",
                height: "auto",
                objectFit: "cover",
              }}
              onError={() => setImgError2(true)}
            />
          </Box>
        </>
      ) : (
        <Typography
          variant="body1"
          sx={{ textAlign: "center", color: "gray" }}
        >
          Upload an image and run analysis to see results here.
        </Typography>
      )}
    </Box>
  );
}
