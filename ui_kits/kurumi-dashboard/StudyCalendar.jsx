/* Atelier Mucha kit — 学習カレンダー（その日の予定を表示）*/
(function () {
const { Card, Badge } = window.AtelierMuchaDesignSystem_29c0c4;

const WD = ["月", "火", "水", "木", "金", "土", "日"];
const SHORT = { "算数": "算", "国語": "国", "理科": "理", "社会": "社" };

function StudyCalendar({ variant }) {
  const full = variant === "full";
  const c = window.MOCK.calendar;
  const daysInMonth = new Date(c.year, c.month, 0).getDate();
  const lead = (c.firstWeekday + 6) % 7; // 月曜始まりの先頭空白数

  // 集計：予定がある日 / 報告ずみの日
  let planned = 0, reported = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if ((c.plan[d] || []).length) planned++;
    if (c.reports[d]) reported++;
  }

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // カラー凡例（4科）
  const legend = window.MOCK.subjects;

  return (
    <Card style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Calendar · 学習予定</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.45rem", color: "var(--ink)", lineHeight: 1 }}>{c.label}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)" }}>
              報告ずみ <span className="tnum" style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{reported}</span> 日
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {legend.map((s) => (
            <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-soft)" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.chart }} />{s.name}
            </span>
          ))}
        </div>
      </div>

      {/* weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: full ? 8 : 6, marginBottom: 7 }}>
        {WD.map((w, i) => (
          <div key={w} style={{ textAlign: "center", fontFamily: "var(--font-body)", fontSize: 11.5, color: i >= 5 ? "var(--ink-faint)" : "var(--ink-soft)" }}>{w}</div>
        ))}
      </div>

      {/* grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: full ? 8 : 6 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={"e" + i} />;
          const items = c.plan[d] || [];
          const isToday = d === c.today;
          const isPast = d < c.today;
          const rep = !!c.reports[d];
          const rest = items.length === 0;
          return (
            <div key={d} title={items.map((it) => it.subj + "：" + it.mat).join(" / ") || "お休み"}
              style={{
                position: "relative", borderRadius: "var(--radius-sm)",
                minHeight: full ? 92 : 58,
                background: isToday ? "var(--gold-veil)" : rest ? "var(--surface-sunken)" : "var(--surface)",
                border: isToday ? "2px solid var(--gold-deep)" : "1px solid var(--line)",
                opacity: isPast && !isToday ? 0.72 : 1,
                padding: full ? "7px 8px" : "5px 6px",
                display: "flex", flexDirection: "column", gap: full ? 5 : 4,
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="tnum" style={{
                  fontFamily: "var(--font-body)", fontSize: full ? 13 : 11.5, lineHeight: 1,
                  fontWeight: isToday ? 700 : 500, color: isToday ? "var(--gold-deep)" : "var(--ink-soft)",
                }}>{d}</span>
                {rep && <Icon name="check" size={full ? 13 : 11} color="var(--success, #86A471)" />}
              </div>

              {/* full: 科目＋教材チップ / compact: ドット */}
              {full
                ? items.map((it, k) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: it.color, flex: "0 0 auto" }} />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.mat}</span>
                    </div>
                  ))
                : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: "auto" }}>
                    {items.map((it, k) => (
                      <span key={k} title={it.subj + "：" + it.mat} style={{ width: 7, height: 7, borderRadius: "50%", background: it.color }} />
                    ))}
                  </div>
                )}

              {rest && (
                <span style={{ fontFamily: "var(--font-body)", fontSize: full ? 11.5 : 10, color: "var(--ink-faint)", marginTop: "auto" }}>お休み</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

window.StudyCalendar = StudyCalendar;
})();
