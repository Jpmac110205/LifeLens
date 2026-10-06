import Icon from "./Icon";
export default function Header({
  onAbout,
  onEthics,
  onReset,
  hasSession,
  status,
  onRetry,
}: {
  onAbout: () => void;
  onEthics: () => void;
  onReset: () => void;
  hasSession: boolean;
  status: "checking" | "online" | "offline";
  onRetry: () => void;
}) {
  return (
    <>
      <aside className="sidebar">
        <a className="brand" href="#workspace" aria-label="LifeLens workspace">
          <span className="brand-symbol">
            <Icon name="lens" size={30} />
          </span>
          LifeLens<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-caption">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          <a href="#workspace" className="nav-item active" aria-current="page">
            <Icon name="grid" />
            Overview
            <Icon name="arrow" size={16} />
          </a>
          <a
            href="#assistant"
            className="nav-item"
            title="AI assistant"
            aria-label="AI assistant"
          >
            <Icon name="chat" />
            AI assistant
          </a>
          <button
            className="nav-item"
            title="Responsible AI"
            aria-label="Responsible AI"
            onClick={onEthics}
          >
            <Icon name="shield" />
            Responsible AI
          </button>
          <button
            className="nav-item"
            title="About LifeLens"
            aria-label="About LifeLens"
            onClick={onAbout}
          >
            <Icon name="info" />
            About LifeLens
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="research-card">
            <span className="research-icon">
              <Icon name="heart" size={22} />
            </span>
            <h3>Built for understanding.</h3>
            <p>
              Explore AI-assisted image analysis in a thoughtful research
              environment.
            </p>
            <span className="research-label">
              <span className="status-dot" />
              RESEARCH & EDUCATION
            </span>
          </div>
          <div className="sidebar-foot">
            <span className="mini-brand">
              <Icon name="lens" size={18} />
            </span>
            <div>
              LifeLens workspace<small>Research edition · v1.0</small>
            </div>
          </div>
        </div>
      </aside>
      <header className="topbar">
        <div className="breadcrumb">
          <span>Workspace</span>
          <span>/</span>
          <strong>Overview</strong>
        </div>
        <div className="topbar-actions">
          <button
            className={`connection ${status}`}
            onClick={onRetry}
            title="Check backend connection"
          >
            <span className="status-dot" />
            {status === "online"
              ? "Server connected"
              : status === "checking"
                ? "Connecting"
                : "Server offline"}
          </button>
          <button
            className="button button-secondary button-small"
            onClick={onReset}
            disabled={!hasSession}
          >
            <Icon name="reset" size={15} />
            <span>New analysis</span>
          </button>
          <span className="avatar" aria-label="Research workspace">
            R
          </span>
        </div>
      </header>
    </>
  );
}
