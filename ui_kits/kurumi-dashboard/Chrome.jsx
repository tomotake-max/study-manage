/* Atelier Mucha kit — shared chrome: Wordmark, TopBar, SectionTitle, HistoryStrip */
(function () {
const { Badge, Button } = window.AtelierMuchaDesignSystem_29c0c4;

function Wordmark({ compact }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid var(--gold)", background: "var(--gold-veil)", flex: "0 0 auto" }}>
        <span style={{ width: 7, height: 7, transform: "rotate(45deg)", background: "var(--gold)" }} />
      </span>
      {!compact && (
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 23, color: "var(--ink)", letterSpacing: "-.01em", lineHeight: 1 }}>
          くるみ<span style={{ color: "var(--gold-deep)" }}>さん</span>
        </span>
      )}
    </div>
  );
}

function Icon({ name, size = 18, color = "currentColor", style = {} }) {
  // lucide replaces <i data-lucide> with an <svg>; re-run handled in App effect
  return <i data-lucide={name} style={{ width: size, height: size, color, display: "inline-flex", ...style }} />;
}

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h2 style={{ fontSize: "1.5rem" }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function TopBar({ title, subtitle, right }) {
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

/* 14-day study-minutes bar strip */
function HistoryStrip({ data, color = "var(--gold)" }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 56 }}>
      {data.map((v, i) => (
        <div key={i} title={v + " min"} style={{
          flex: 1,
          height: Math.max((v / max) * 100, 3) + "%",
          minHeight: 3,
          background: v === 0 ? "var(--surface-sunken)" : color,
          opacity: i === data.length - 1 ? 1 : 0.45 + (i / data.length) * 0.4,
          borderRadius: "3px 3px 0 0",
        }} />
      ))}
    </div>
  );
}

Object.assign(window, { Wordmark, Icon, SectionTitle, TopBar, HistoryStrip });
})();
