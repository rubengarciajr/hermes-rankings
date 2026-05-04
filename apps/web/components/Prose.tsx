import type { PropsWithChildren } from "react";

export function Prose({ children }: PropsWithChildren) {
  return <div className="hr-prose">{children}</div>;
}

export function H2({ children }: PropsWithChildren) {
  return (
    <h2 className="font-display text-foreground text-xl mt-12 mb-4 first:mt-0">
      {children}
    </h2>
  );
}

export function H3({ children }: PropsWithChildren) {
  return (
    <h3 className="font-display text-foreground text-base mt-8 mb-3">
      {children}
    </h3>
  );
}

export function P({ children }: PropsWithChildren) {
  return (
    <p className="text-foreground-muted leading-relaxed mb-4 max-w-prose">
      {children}
    </p>
  );
}

export function Lead({ children }: PropsWithChildren) {
  return (
    <p className="text-foreground leading-relaxed mb-8 max-w-prose">
      {children}
    </p>
  );
}

export function UL({ children }: PropsWithChildren) {
  return (
    <ul className="text-foreground-muted leading-relaxed mb-4 space-y-2 list-disc list-outside ml-5 max-w-prose">
      {children}
    </ul>
  );
}

export function Code({ children }: PropsWithChildren) {
  return (
    <code className="font-mono text-accent-gold text-[0.85em] bg-background-soft px-1.5 py-0.5 border border-border-faint">
      {children}
    </code>
  );
}

export function Pre({
  children,
  label,
}: PropsWithChildren<{ label?: string }>) {
  return (
    <div className="mb-6 max-w-prose">
      {label && (
        <p className="label-sm text-foreground-faint mb-2">{label}</p>
      )}
      <pre className="font-mono text-xs bg-background-soft border border-border-faint p-4 overflow-x-auto leading-relaxed">
        <code className="text-foreground">{children}</code>
      </pre>
    </div>
  );
}

export function DocsLayout({
  eyebrow,
  title,
  children,
}: PropsWithChildren<{ eyebrow: string; title: string }>) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="label text-accent-gold mb-3">{eyebrow}</p>
      <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-10 leading-[1.1]">
        {title}
      </h1>
      {children}
    </div>
  );
}
