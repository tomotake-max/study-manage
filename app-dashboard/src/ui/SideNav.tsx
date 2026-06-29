import { useState } from "react";
import type React from "react";

export type SideNavItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
};

function NavRow({
  item,
  active,
  onClick,
}: {
  item: SideNavItem;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        textAlign: "left",
        border: "none",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        padding: "10px 12px",
        fontFamily: "var(--font-body)",
        fontSize: 14.5,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--ink)" : "var(--ink-soft)",
        background: active ? "var(--gold-veil)" : hover ? "var(--surface-sunken)" : "transparent",
        transition: "background var(--dur-fast) var(--ease-organic), color var(--dur-fast) var(--ease-organic)",
      }}
    >
      {item.icon && (
        <span style={{ display: "inline-flex", color: active ? "var(--gold-deep)" : "var(--ink-faint)", flex: "0 0 auto" }}>
          {item.icon}
        </span>
      )}
      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span
          className="tnum"
          style={{
            display: "inline-grid",
            placeItems: "center",
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            borderRadius: "var(--radius-pill)",
            background: active ? "var(--gold)" : "var(--line-strong)",
            color: active ? "var(--canvas)" : "var(--ink-soft)",
            fontFamily: "var(--font-body)",
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

export function SideNav({
  items,
  value,
  onChange,
}: {
  items: SideNavItem[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 12px" }}>
      {items.map((item) => (
        <NavRow key={item.id} item={item} active={item.id === value} onClick={() => onChange(item.id)} />
      ))}
    </nav>
  );
}
