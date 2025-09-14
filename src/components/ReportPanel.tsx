import { Box, Typography } from "@mui/material";

export default function ReportPanel({ runAnalysis }: { runAnalysis: boolean }) {
  return (
    <Box
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: "40px",
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
        gap: "1rem",
      }}
    >
      {runAnalysis ? (
        <>
          <Typography variant="body1">
            Cancerous tissue detected in upper left. It is recommended to consult with a doctor
            as soon as possible.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <img
              src="https://www.google.com/imgres?q=cancer%20scan&imgurl=https%3A%2F%2Fmedia.npr.org%2Fassets%2Fimg%2F2015%2F04%2F10%2Fspiral-ct-scan-ea5530feb04567ed63443167fcf1849593f085b3.jpg&imgrefurl=https%3A%2F%2Fwww.npr.org%2Fsections%2Fhealth-shots%2F2015%2F04%2F13%2F398101515%2Fwhy-some-doctors-are-hesitant-to-screen-smokers-for-lung-cancer&docid=_h7R7x2XTw58aM&tbnid=xm4dtpwTJ0ZhjM&vet=12ahUKEwipyru44sqPAxUZEFkFHaBoAcIQM3oECB8QAA..i&w=1881&h=1411&hcb=2&ved=2ahUKEwipyru44sqPAxUZEFkFHaBoAcIQM3oECB8QAA"
              alt="scan1"
              style={{ borderRadius: "10px" }}
            />
            <img
              src="https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.itnonline.com%2Fcontent%2Flung-cancer-death-decline-associated-screening-earlier-diagnosis-and-surgery&psig=AOvVaw1wp7meO_jjJJESlkFr1NBH&ust=1757476004769000&source=images&cd=vfe&opi=89978449&ved=0CBYQjRxqFwoTCJj-4cPiyo8DFQAAAAAdAAAAABAE"
              alt="scan2"
              style={{ borderRadius: "10px" }}
            />
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
