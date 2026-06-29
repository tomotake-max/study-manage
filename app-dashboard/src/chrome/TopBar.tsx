import type React from "react";

export function TopBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "22px 36px", borderBottom: "1px solid var(--line)", background: "var(--canvas)" }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>{subtitle}</div>
        <h1 style={{ fontSize: "1.7rem" }}>{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{right}</div>
    </header>
  );
}
