export type CancerType = "breast" | "melanoma";
export type Message = { role: "user" | "assistant"; content: string };
export type Analysis = {
  diagnosis: "benign" | "malignant";
  certainty_percent: number;
  riskLevel: "low" | "medium" | "high";
  gradcam_overlay: string | null;
  cancerType: CancerType;
  completedAt: string;
};
export const cancerLabels: Record<CancerType, string> = {
  breast: "Breast cancer",
  melanoma: "Melanoma",
};
export const researchNotice =
  "This report is for research purposes only and should not be used for medical diagnosis or treatment. Please consult a qualified healthcare provider.";
