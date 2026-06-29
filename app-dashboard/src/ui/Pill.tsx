import type React from "react";

export function Pill({
  children,
  active,
  onClick,
  color,
}: {
  children?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: "1px solid " + (active ? "var(--gold)" : "var(--line)"),
        background: active ? "var(--gold-veil)" : "var(--surface)",
        color: active ? "var(--gold-deep)" : "var(--ink-soft)",
        borderRadius: "var(--radius-pill)",
        padding: "5px 13px",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: 13,
        whiteSpace: "nowrap",
        transition: "background var(--dur-fast) var(--ease-organic), border-color var(--dur-fast) var(--ease-organic)",
      }}
    >
      {color && (
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flex: "0 0 auto" }} />
      )}
      {children}
    </button>
  );
}
