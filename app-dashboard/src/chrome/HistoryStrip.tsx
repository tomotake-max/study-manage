/* 14-day study-minutes bar strip */
export function HistoryStrip({ data, color = "var(--gold)" }: { data: number[]; color?: string }) {
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
