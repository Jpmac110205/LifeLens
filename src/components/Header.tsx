import { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import exampleImg from "../assets/logo.png";

export default function Header(
  { hasChatStarted, reviewedEthics }: { hasChatStarted: boolean; reviewedEthics: () => void }) {
  const [creditsOpen, setCreditsOpen] = useState(false);

  const openEthicsCode = () => {
    window.open(
      "https://www.unesco.org/en/artificial-intelligence/recommendation-ethics?utm_source=chatgpt.com",
      "_blank",
      "noopener,noreferrer"
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreditsOpen(false);
    };
    if (creditsOpen) document.addEventListener("keydown", onKey);
    else document.removeEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [creditsOpen]);
  return (
  <>
      <Box
        style={{
          width: "30%",
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <img
          src={exampleImg}
          alt="LifeLens Logo"
          style={{ width: "100%", objectFit: "cover" }}
        />
      </Box>

    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
  {/* Left side */}
  <Box sx={{ display: "flex", gap: 2 }}>
  </Box>

  {/* Right side */}
    <Box sx={{ display: "flex", gap: 2 }}>
    <Button
      variant="outlined"
      sx={{ borderRadius: "20px", bgcolor: "white" }}
      onClick={() => setCreditsOpen(true)}
    >
      CREDITS
    </Button>
    <Button
      variant="outlined"
      sx={{ borderRadius: "20px", bgcolor: "white" }}
      disabled={!hasChatStarted}
      onClick={() => {
        reviewedEthics();
        openEthicsCode();
      }}
    >
      ETHICS CODE
    </Button>
  </Box>
</Box>
        {/* Credits modal */}
        {creditsOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Credits"
            onClick={() => setCreditsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.45)",
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 600,
                width: "90%",
                background: "#fff",
                borderRadius: 8,
                padding: 20,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Credits</h3>
                <button
                  aria-label="Close credits"
                  onClick={() => setCreditsOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ lineHeight: 1.6 }}>
                <p style={{ marginTop: 0 }}>
                  LifeLens was built by a solo developer. Data and models are provided for research and demonstration purposes only. All code is open source and located on GitHub.
                </p>
                <p>
                  Links: <br></br>          
                  https://www.kaggle.com/datasets/hasnainjaved/melanoma-skin-cancer-dataset-of-10000-images
                  https://www.kaggle.com/datasets/obulisainaren/multi-cancer
                  https://www.kaggle.com/datasets/ambarish/breakhis
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <Button variant="contained" onClick={() => setCreditsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
