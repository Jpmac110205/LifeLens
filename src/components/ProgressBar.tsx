import Icon from "./Icon";
export default function ProgressBar({
  hasFile,
  hasResult,
  hasChat,
  exported,
  loading,
}: {
  hasFile: boolean;
  hasResult: boolean;
  hasChat: boolean;
  exported: boolean;
  loading: boolean;
}) {
  const steps = [
    { title: "Upload image", detail: "Choose your input", done: hasFile },
    {
      title: "Run analysis",
      detail: "Explore model insights",
      done: hasResult,
    },
    {
      title: "Understand results",
      detail: "Ask your questions",
      done: hasChat,
    },
    {
      title: "Save your report",
      detail: "Keep a research copy",
      done: exported,
    },
  ];
  const active = steps.findIndex((step) => !step.done);
  return (
    <ol className="steps" aria-label="Analysis progress">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className={`${step.done ? "done" : ""} ${i === active ? "current" : ""}`}
          aria-current={i === active ? "step" : undefined}
        >
          <span className={`step-number ${i === 1 && loading ? "pulse" : ""}`}>
            {step.done ? <Icon name="check" size={17} /> : `0${i + 1}`}
          </span>
          <div>
            <strong>{step.title}</strong>
            <small>
              {i === 1 && loading ? "Analysis in progress…" : step.detail}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
