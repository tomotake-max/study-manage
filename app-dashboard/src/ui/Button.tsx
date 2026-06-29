import { useState } from "react";
import type React from "react";

type Variant = "solid" | "ghost" | "outline";
type Size = "sm" | "md";

export function Button({
  children,
  onClick,
  variant = "solid",
  size = "md",
  iconLeft,
  active,
  title,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  iconLeft?: React.ReactNode;
  active?: boolean;
  title?: string;
}) {
  const [hover, setHover] = useState(false);

  const pad = size === "sm" ? "7px 14px" : "10px 18px";
  const fontSize = size === "sm" ? 13.5 : 14.5;

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: pad,
    fontSize,
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: "var(--radius-pill)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background var(--dur-fast) var(--ease-organic), border-color var(--dur-fast) var(--ease-organic), color var(--dur-fast) var(--ease-organic)",
    border: "1px solid transparent",
  };

  let style: React.CSSProperties;
  if (variant === "solid") {
    style = {
      ...base,
      background: hover ? "var(--gold-deep)" : "var(--gold)",
      color: "var(--canvas)",
      borderColor: "transparent",
    };
  } else if (variant === "outline") {
    style = {
      ...base,
      background: active ? "var(--gold-veil)" : hover ? "var(--surface-sunken)" : "transparent",
      color: active ? "var(--gold-deep)" : "var(--ink)",
      borderColor: active ? "var(--gold)" : "var(--line)",
    };
  } else {
    // ghost
    style = {
      ...base,
      background: active ? "var(--gold-veil)" : hover ? "var(--surface-sunken)" : "transparent",
      color: active ? "var(--gold-deep)" : "var(--ink-soft)",
      borderColor: "transparent",
    };
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {iconLeft}
      {children}
    </button>
  );
}
