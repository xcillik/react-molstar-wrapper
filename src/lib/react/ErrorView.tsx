export default function ErrorView() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backdropFilter: "blur(5px)",
        backgroundColor: "#0000000A",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="Error icon"
          >
            <title>Error</title>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#1f2937",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Error loading viewer
          </p>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              fontSize: "0.75rem",
              color: "#6b7280",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Please try refreshing the page
          </p>
        </div>
      </div>
    </div>
  );
}
