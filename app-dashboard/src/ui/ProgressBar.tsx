export function ProgressBar({
  value,
  color = "var(--gold)",
  height = 8,
  track = "var(--surface-sunken)",
}: {
  value: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      style={{
        height,
        borderRadius: height,
        background: track,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          height: "100%",
          width: pct + "%",
          background: color,
          borderRadius: height,
          transition: "width var(--dur-fast) var(--ease-organic)",
        }}
      />
    </div>
  );
}
