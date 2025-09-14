import { Box, Button } from "@mui/material";
import exampleImg from "../assets/logo.png";

export default function Header({ reviewedEthics }: { reviewedEthics: () => void }) {
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
    <Button
      variant="outlined"
      sx={{ borderRadius: "20px", bgcolor: "white" }}
    >
      FIND A DOCTOR
    </Button>
  </Box>

  {/* Right side */}
  <Box sx={{ display: "flex", gap: 2 }}>
    <Button variant="outlined" sx={{ borderRadius: "20px", bgcolor: "white" }}>
      CREDITS
    </Button>
    <Button
      variant="outlined"
      sx={{ borderRadius: "20px", bgcolor: "white" }}
      onClick={reviewedEthics}
    >
      ETHICS CODE
    </Button>
  </Box>
</Box>

    </>
  );
}
