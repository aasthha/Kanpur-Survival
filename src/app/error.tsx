"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 20, color: "red", background: "#fdd", zIndex: 9999, position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflow: "auto" }}>
      <h2>Something went wrong!</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>{error.stack}</pre>
      <button onClick={() => reset()} style={{ padding: "10px 20px", marginTop: 20 }}>Try again</button>
    </div>
  );
}
