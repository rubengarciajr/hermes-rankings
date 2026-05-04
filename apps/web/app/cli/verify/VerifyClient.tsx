"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

type Status =
  | { kind: "missing-nonce" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "success"; handle: string }
  | { kind: "error"; message: string };

export function VerifyClient({
  nonce,
  siteKey,
}: {
  nonce: string;
  siteKey: string;
}) {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>(
    nonce ? { kind: "loading" } : { kind: "missing-nonce" },
  );
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!nonce || !scriptReady || !widgetRef.current || !window.turnstile) {
      return;
    }
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(widgetRef.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: async (token) => {
        setStatus({ kind: "submitting" });
        try {
          const res = await fetch("/api/v1/register/complete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              nonce,
              turnstile_token: token,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setStatus({
              kind: "error",
              message: json.error ?? `HTTP ${res.status}`,
            });
            return;
          }
          setStatus({ kind: "success", handle: json.handle });
        } catch (err) {
          setStatus({
            kind: "error",
            message: err instanceof Error ? err.message : "network_error",
          });
        }
      },
      "error-callback": () =>
        setStatus({ kind: "error", message: "turnstile_widget_error" }),
      "expired-callback": () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    });
    setStatus({ kind: "ready" });
  }, [nonce, scriptReady, siteKey]);

  if (status.kind === "missing-nonce") {
    return (
      <div className="border border-danger/30 bg-danger/5 p-6">
        <p className="label-sm text-danger mb-2">NO NONCE</p>
        <p className="text-foreground-muted">
          Open this page from the link printed by{" "}
          <code className="text-accent-gold">hermes-rank submit</code>, not
          directly.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      {(status.kind === "loading" || status.kind === "ready") && (
        <div>
          <div ref={widgetRef} className="mb-6 min-h-[65px]" />
          <p className="label-sm text-foreground-muted">
            Tick the box above. Your CLI is waiting.
          </p>
        </div>
      )}

      {status.kind === "submitting" && (
        <p className="label text-accent-gold">VERIFYING…</p>
      )}

      {status.kind === "success" && (
        <div className="border border-accent-gold/40 bg-accent-gold/5 p-6">
          <p className="label text-accent-gold mb-3">✓ VERIFIED</p>
          <p className="text-foreground mb-2">
            Welcome, <span className="font-mono text-accent-gold">{status.handle}</span>.
          </p>
          <p className="text-foreground-muted">
            Return to your terminal — your CLI is finishing up.
          </p>
        </div>
      )}

      {status.kind === "error" && (
        <div className="border border-danger/30 bg-danger/5 p-6">
          <p className="label-sm text-danger mb-2">ERROR</p>
          <p className="text-foreground-muted font-mono text-sm">
            {status.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 border border-border-soft text-foreground-muted label-sm px-3 py-2 hover:text-foreground hover:border-border-strong transition"
          >
            Try again
          </button>
        </div>
      )}
    </>
  );
}
