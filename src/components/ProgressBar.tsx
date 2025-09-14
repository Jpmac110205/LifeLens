import { Box, Typography } from "@mui/material";

export default function ProgressBar({
  runAnalysis,
  uploadedImage,
  hasChatStarted,
  ethicsReviewed,
}: {
  runAnalysis: boolean;
  uploadedImage: File | null;
  hasChatStarted: boolean;
  ethicsReviewed: boolean;
}) {
  const steps = [
    { text: "Upload image Specify Cancer", done: !!uploadedImage },
    { text: "Run AI Analysis Model", done: runAnalysis },
    { text: "Discuss results with LifeLens", done: hasChatStarted },
    { text: "Review AI Ethics Code", done: ethicsReviewed },
    { text: "Download Demo Report", done: false },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        height: 200,
        backgroundColor: "white",
        borderRadius: "40px",
        mb: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        p: 2,
      }}
    >
      {steps.map((step, i) => (
        <Box
          key={i}
          sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              bgcolor: step.done ? "limegreen" : "lightgray",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1,
            }}
          >
            <Typography variant="h6">{step.done ? "✓" : "✕"}</Typography>
          </Box>
          <Typography sx={{ textAlign: "center", fontSize: "0.9rem" }}>
            {step.text}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
