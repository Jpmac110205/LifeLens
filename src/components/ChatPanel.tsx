import { Box, Button, TextField, Typography } from "@mui/material";
import { useState, useRef, useEffect } from "react";

export default function ChatPanel({
  setHasChatStarted,
  runAnalysis,
}: {
  setHasChatStarted: (val: boolean) => void;
  runAnalysis: boolean;
}) {
  const [messages, setMessages] = useState([
    { text: "So your results say...", sender: "bot" },
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !runAnalysis) return;

    setMessages([...messages, { text: input, sender: "user" }]);
    setInput("");
    setHasChatStarted(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: 350,
        backgroundColor: "white",
        borderRadius: "40px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        p: 2,
        position: "relative",
      }}
    >
      <Typography variant="h6" sx={{ textAlign: "center", fontWeight: "bold" }}>
        Chat with LifeLens AI
      </Typography>

      {!runAnalysis && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(255,255,255,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1,
            borderRadius: "40px",
            textAlign: "center",
            p: 2,
          }}
        >
          <Typography variant="body1" sx={{ color: "#555" }}>
            Please run the AI analysis first to start chatting.
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          pr: 1,
        }}
      >
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              bgcolor: msg.sender === "user" ? "#8cc2f7" : "lightgray",
              p: 1,
              borderRadius: "10px",
              color: msg.sender === "user" ? "white" : "black",
              maxWidth: "70%",
              wordWrap: "break-word",
            }}
          >
            {msg.text}
          </Box>
        ))}
        <div ref={chatEndRef} />
      </Box>

      <Box sx={{ display: "flex", mt: 1 }}>
        <TextField
          fullWidth
          placeholder="Ask LifeLens..."
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={!runAnalysis}
          sx={{
            borderRadius: "20px",
            bgcolor: "white",
            "& .MuiInputBase-input": { p: "10px 14px" },
          }}
        />
        <Button sx={{ ml: 1 }} onClick={handleSend} disabled={!runAnalysis}>
          ➤
        </Button>
      </Box>
    </Box>
  );
}
