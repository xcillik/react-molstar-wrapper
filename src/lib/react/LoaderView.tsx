export default function LoaderView() {
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
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "6px solid #e5e7eb",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "#6b7280",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Loading...
        </p>
        <style>
          {`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
        </style>
      </div>
    </div>
  );
}
