import type React from "react";

export function Card({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)",
        padding: 18,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
