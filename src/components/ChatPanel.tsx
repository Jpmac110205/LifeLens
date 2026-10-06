import { useEffect, useRef, useState } from "react";
import { sendChat } from "../lib/api";
import type { Analysis, Message } from "../lib/types";
import Icon from "./Icon";
const prompts = [
  "Explain my results",
  "What does confidence mean?",
  "How does the attention map work?",
];
export default function ChatPanel({
  analysis,
  messages,
  onMessages,
}: {
  analysis: Analysis | null;
  messages: Message[];
  onMessages: (messages: Message[]) => void;
}) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, pending, error]);
  const submit = async (text: string, retry = false) => {
    const content = text.trim();
    if (
      !analysis ||
      !content ||
      pending ||
      controller.current ||
      content.length > 2000
    )
      return;
    const history = retry ? messages.slice(0, -1) : messages;
    const next: Message[] = [...history, { role: "user", content }];
    onMessages(next);
    setInput("");
    setError(null);
    setPending(true);
    const request = new AbortController();
    controller.current = request;
    try {
      const reply = await sendChat(content, analysis, history, request.signal);
      if (!request.signal.aborted)
        onMessages([...next, { role: "assistant", content: reply }]);
    } catch (cause) {
      if (!request.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not reach the assistant. Please try again.",
        );
    } finally {
      if (!request.signal.aborted) {
        setPending(false);
        controller.current = null;
      }
    }
  };
  return (
    <section
      id="assistant"
      className="panel chat-panel"
      aria-labelledby="chat-title"
    >
      <div className="panel-heading">
        <span className="section-icon">
          <Icon name="spark" />
        </span>
        <div>
          <h2 id="chat-title">A conversation for clarity</h2>
          <p>Ask LifeLens about the model and your results.</p>
        </div>
        <span className="badge badge-green">
          <Icon name="spark" size={12} />
          AI assistant
        </span>
      </div>
      <div
        className="chat-body"
        ref={log}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        <div className="message assistant-message">
          <span className="bot-avatar">
            <Icon name="lens" size={20} />
          </span>
          <div>
            <strong>
              LifeLens <span>Research assistant</span>
            </strong>
            <p>
              {analysis
                ? "Your analysis is ready. I can help explain the model prediction, confidence, and attention map. What would you like to explore?"
                : "Hello, curious mind. Upload an image and run an analysis to get started. Then we can explore what the model sees, together."}
            </p>
          </div>
        </div>
        {messages.map((message, index) => (
          <div
            className={`message ${message.role === "user" ? "user-message" : "assistant-message"}`}
            key={index}
          >
            <span
              className={message.role === "user" ? "user-avatar" : "bot-avatar"}
            >
              {message.role === "user" ? "Y" : <Icon name="lens" size={20} />}
            </span>
            <div>
              <strong>{message.role === "user" ? "You" : "LifeLens"}</strong>
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        {pending && (
          <div className="chat-pending" role="status">
            <span className="spinner" />
            LifeLens is thinking…
          </div>
        )}
        {error && (
          <div className="inline-error" role="alert">
            <span>{error}</span>
            <button
              className="text-button"
              onClick={() =>
                void submit(messages[messages.length - 1]?.content || "", true)
              }
            >
              Retry
            </button>
          </div>
        )}
      </div>
      <div className="suggested-prompts">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            disabled={!analysis || pending || !!error}
            onClick={() => void submit(prompt)}
          >
            {prompt}
            <Icon name="arrow" size={13} />
          </button>
        ))}
      </div>
      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          if (!error) void submit(input);
        }}
      >
        <textarea
          rows={1}
          value={input}
          maxLength={2000}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (!error) void submit(input);
            }
          }}
          disabled={!analysis || pending || !!error}
          aria-label="Ask LifeLens"
          placeholder={
            analysis
              ? "What would you like to understand?"
              : "Run an analysis to start your conversation…"
          }
        />
        <button
          className="send-button"
          disabled={!analysis || pending || !input.trim() || !!error}
          aria-label="Send message"
        >
          <Icon name="arrow" size={19} />
        </button>
      </form>
      <div className="chat-footnote">
        <Icon name="info" size={13} />
        <span>
          AI can make mistakes. Use these explanations for research and discuss
          medical questions with a professional.
        </span>
      </div>
    </section>
  );
}
