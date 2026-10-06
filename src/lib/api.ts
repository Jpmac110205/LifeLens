import type { Analysis, CancerType, Message } from "./types";

const baseUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export async function apiRequest(
  path: string,
  options: RequestInit = {},
  timeout = 120_000,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = window.setTimeout(abort, timeout);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        typeof data?.detail === "string"
          ? data.detail
          : `The request failed (${response.status}). Please try again.`,
      );
    }
    if (!data)
      throw new Error(
        "The server returned an empty response. Please try again.",
      );
    return data;
  } catch (error) {
    if (options.signal?.aborted)
      throw new DOMException("Cancelled", "AbortError");
    if (controller.signal.aborted)
      throw new Error("The request took too long. Please try again.");
    if (error instanceof TypeError)
      throw new Error(
        "Cannot reach the LifeLens server. Check that the backend is running and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export async function predict(
  file: File,
  cancerType: CancerType,
  signal: AbortSignal,
): Promise<Analysis> {
  const form = new FormData();
  form.append("file", file);
  form.append("cancerType", cancerType);
  const data = (await apiRequest("/predict", {
    method: "POST",
    body: form,
    signal,
  })) as Partial<Analysis>;
  if (
    !["benign", "malignant"].includes(data.diagnosis || "") ||
    typeof data.certainty_percent !== "number" ||
    !Number.isFinite(data.certainty_percent) ||
    data.certainty_percent < 0 ||
    data.certainty_percent > 100 ||
    !["low", "medium", "high"].includes(data.riskLevel || "")
  ) {
    throw new Error(
      "The server returned an invalid analysis. Please try again.",
    );
  }
  const overlay = data.gradcam_overlay;
  if (
    overlay != null &&
    (typeof overlay !== "string" ||
      !/^(data:image\/png;base64,)?[A-Za-z0-9+/=\s]+$/.test(overlay))
  ) {
    throw new Error(
      "The server returned an invalid attention map. Please try again.",
    );
  }
  return {
    ...data,
    gradcam_overlay: overlay
      ? overlay.startsWith("data:")
        ? overlay
        : `data:image/png;base64,${overlay}`
      : null,
    cancerType,
    completedAt: new Date().toISOString(),
  } as Analysis;
}
export async function sendChat(
  message: string,
  analysis: Analysis,
  history: Message[],
  signal: AbortSignal,
): Promise<string> {
  const data = (await apiRequest(
    "/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        message,
        analysis: {
          cancerType: analysis.cancerType,
          diagnosis: analysis.diagnosis,
          certainty_percent: analysis.certainty_percent,
          riskLevel: analysis.riskLevel,
        },
        history: history.slice(-20),
      }),
    },
    60_000,
  )) as { reply?: unknown; error?: unknown };
  if (data.error || typeof data.reply !== "string" || !data.reply.trim())
    throw new Error("The assistant could not respond. Please try again.");
  return data.reply;
}
