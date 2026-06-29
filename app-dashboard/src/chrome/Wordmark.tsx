export function Wordmark({ compact }: { compact?: boolean }) {
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
