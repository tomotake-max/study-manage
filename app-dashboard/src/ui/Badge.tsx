import type React from "react";

type Tone = "gold" | "neutral" | "danger" | "success";

const TONES: Record<Tone, { bg: string; color: string; border: string }> = {
  gold: { bg: "var(--gold-veil)", color: "var(--gold-deep)", border: "var(--gold)" },
  neutral: { bg: "var(--surface-sunken)", color: "var(--ink-soft)", border: "var(--line)" },
  danger: { bg: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)", border: "color-mix(in srgb, var(--danger) 35%, transparent)" },
  success: { bg: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)", border: "color-mix(in srgb, var(--success) 35%, transparent)" },
};

export function Badge({ children, tone = "neutral" }: { children?: React.ReactNode; tone?: Tone }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: "var(--radius-pill)",
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        fontFamily: "var(--font-body)",
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
