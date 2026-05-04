"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#041C1C",
          color: "#ffe6cb",
          fontFamily: "ui-monospace, monospace",
          padding: "8rem 1.5rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#fb2c36", letterSpacing: "0.1875rem" }}>
          FATAL ERROR
        </p>
        <h1 style={{ color: "#ffe6cb", fontSize: "2rem", marginTop: "0.75rem" }}>
          The page failed to render.
        </h1>
        <p style={{ marginTop: "1rem", color: "rgba(255,230,203,0.7)" }}>
          Reload the page. If it keeps happening, something is broken upstream.
        </p>
        {error.digest && (
          <p
            style={{
              marginTop: "1rem",
              color: "rgba(255,230,203,0.4)",
              fontSize: "0.75rem",
            }}
          >
            digest: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "2rem",
            border: "1px solid #ffbd38",
            color: "#ffbd38",
            background: "transparent",
            padding: "0.625rem 1rem",
            letterSpacing: "0.1875rem",
            cursor: "pointer",
          }}
        >
          TRY AGAIN
        </button>
      </body>
    </html>
  );
}
