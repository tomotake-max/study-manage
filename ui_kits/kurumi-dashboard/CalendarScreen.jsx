/* Atelier Mucha kit — 学習カレンダー（予定 ＋ 日々の報告 ＋ 時間バランス）*/
(function () {
const { Card, Badge, ProgressBar, Button, Textarea } = window.AtelierMuchaDesignSystem_29c0c4;

const subjectColor = (name) => (window.MOCK.subjects.find((s) => s.name === name) || {}).chart || "var(--ink-faint)";
const hm = (min) => Math.floor(min / 60) + "時間" + (min % 60 ? (min % 60) + "分" : "");

/* 小さな統計タイル */
function Tile({ icon, label, value, unit, tone }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 20px" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-faint)" }}>
        <Icon name={icon} size={14} color={tone || "var(--gold-deep)"} />{label}
      </span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.9rem", color: "var(--ink)", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-soft)" }}>{unit}</span>}
      </span>
    </Card>
  );
}

/* 日々の学習報告（その日の終わり／翌朝に提出）*/
function DailyReport() {
  const c = window.MOCK.calendar;
  const [day, setDay] = React.useState(c.today);          // 今日 or 昨日
  const plan = c.plan[day] || [];
  const [checks, setChecks] = React.useState(() => plan.map(() => false));
  const [note, setNote] = React.useState("");
  const [sent, setSent] = React.useState(!!c.reports[day]);

  React.useEffect(() => {
    setChecks((c.plan[day] || []).map(() => !!c.reports[day]));
    setNote("");
    setSent(!!c.reports[day]);
  }, [day]);

  const doneCount = checks.filter(Boolean).length;
  const tabBtn = (val, label) => (
    <button onClick={() => setDay(val)} style={{
      border: "1px solid " + (day === val ? "var(--gold)" : "var(--line)"),
      background: day === val ? "var(--gold-veil)" : "var(--surface)",
      color: day === val ? "var(--gold-deep)" : "var(--ink-soft)",
      borderRadius: "var(--radius-pill)", padding: "5px 15px", cursor: "pointer",
      fontFamily: "var(--font-body)", fontSize: 13.5,
    }}>{label}</button>
  );

  return (
    <Card accent style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 5 }}>Daily report · 学習の報告</div>
          <h3 style={{ fontSize: "1.2rem" }}>今日の学習を報告しよう</h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)", marginTop: 4 }}>一日の終わり、または次の日の朝にチェック。</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tabBtn(c.today, "今日 " + c.month + "/" + c.today)}
          {tabBtn(c.today - 1, "昨日 " + c.month + "/" + (c.today - 1))}
        </div>
      </div>

      {sent ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--success-veil)", border: "1px solid color-mix(in oklch, var(--success) 40%, transparent)", borderRadius: "var(--radius-md)", padding: "18px 20px" }}>
          <Icon name="check-circle-2" size={22} color="var(--success, #86A471)" />
          <div style={{ fontFamily: "var(--font-body)" }}>
            <div style={{ color: "var(--ink)", fontSize: 15 }}>{c.month}/{day} の報告を受け取りました。</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 13, marginTop: 2 }}>おつかれさま！この調子でつづけよう。</div>
          </div>
          <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => setSent(false)}>修正する</Button>
        </div>
      ) : (
        <React.Fragment>
          {plan.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {plan.map((it, i) => {
                const on = checks[i];
                return (
                  <button key={i} onClick={() => setChecks((cs) => cs.map((v, k) => k === i ? !v : v))} style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer",
                    border: "1px solid " + (on ? "color-mix(in oklch, " + it.color + " 55%, transparent)" : "var(--line)"),
                    background: on ? "color-mix(in oklch, " + it.color + " 9%, var(--surface))" : "var(--surface)",
                    borderRadius: "var(--radius-md)", padding: "12px 15px",
                    transition: "all var(--dur-fast) var(--ease-organic)",
                  }}>
                    <span style={{
                      width: 22, height: 22, flex: "0 0 auto", borderRadius: 6, display: "grid", placeItems: "center",
                      background: on ? it.color : "transparent", border: "1.5px solid " + (on ? it.color : "var(--line-strong)"),
                      color: "var(--surface)",
                    }}>{on && <Icon name="check" size={14} />}</span>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: it.color, flex: "0 0 auto" }} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--ink)" }}>
                      <strong style={{ fontWeight: 600 }}>{it.subj}</strong> ；{it.mat}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-faint)", fontSize: 14, padding: "10px 0 16px" }}>この日はお休みの予定です。</div>
          )}

          <Textarea label="ひとことメモ（任意）" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="むずかしかったところ、できたこと など" />

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-soft)" }}>
              {plan.length > 0 ? <span><span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{doneCount}</span> / {plan.length} 件できた</span> : "—"}
            </span>
            <Button variant="primary" size="sm" style={{ marginLeft: "auto" }} onClick={() => setSent(true)}>
              <Icon name="send" size={15} />&nbsp;報告する
            </Button>
          </div>
        </React.Fragment>
      )}
    </Card>
  );
}

/* 科目別の学習バランス（時間ベース：ドーナツ＋横棒）*/
function SubjectSplit() {
  const rows = window.MOCK.calendar.monthBySubject;
  const totalMin = rows.reduce((a, r) => a + r.min, 0);
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  const segs = rows.map((r) => {
    const frac = r.min / totalMin;
    const seg = { color: subjectColor(r.name), dash: frac * C, off: off * C };
    off += frac;
    return seg;
  });
  return (
    <Card>
      <div className="eyebrow" style={{ marginBottom: 5 }}>By subject · 科目別</div>
      <h3 style={{ fontSize: "1.1rem", marginBottom: 18 }}>今月の学習バランス（時間）</h3>
      <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap" }}>
        <svg width="132" height="132" viewBox="0 0 132 132" style={{ flex: "0 0 auto" }} data-om-raster>
          <g transform="rotate(-90 66 66)">
            {segs.map((s, i) => (
              <circle key={i} cx="66" cy="66" r={R} fill="none" stroke={s.color} strokeWidth="16"
                strokeDasharray={s.dash + " " + (C - s.dash)} strokeDashoffset={-s.off} />
            ))}
          </g>
          <text x="66" y="61" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-display)" className="tnum">{Math.round(totalMin / 60)}</text>
          <text x="66" y="80" textAnchor="middle" fontSize="11" fill="var(--ink-faint)" fontFamily="var(--font-body)">時間</text>
        </svg>
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r) => {
            const pct = Math.round((r.min / totalMin) * 100);
            return (
              <div key={r.name}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: subjectColor(r.name) }} />
                  <span style={{ color: "var(--ink)" }}>{r.name}</span>
                  <span style={{ marginLeft: "auto", color: "var(--ink-faint)", fontSize: 12 }}>{hm(r.min)}</span>
                  <span className="tnum" style={{ color: "var(--ink-soft)", fontWeight: 600, width: 34, textAlign: "right" }}>{pct}%</span>
                </div>
                <ProgressBar value={pct} tone={subjectColor(r.name)} height={6} />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function CalendarScreen({ go }) {
  const c = window.MOCK.calendar;
  const daysInMonth = new Date(c.year, c.month, 0).getDate();
  let reported = 0;
  for (let d = 1; d <= daysInMonth; d++) if (c.reports[d]) reported++;
  const todayPlan = (c.plan[c.today] || []).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* slim tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <Tile icon="flame" label="連続学習" value={window.MOCK.streak.current} unit="日" />
        <Tile icon="calendar-check" label="今月 報告した日" value={reported} unit="日" tone="var(--chart-1)" />
        <Tile icon="list-checks" label="今日の予定" value={todayPlan} unit="件" tone="var(--gold-deep)" />
      </div>

      {/* 報告 */}
      <DailyReport />

      {/* 予定カレンダー */}
      <StudyCalendar variant="full" />

      {/* 時間バランス */}
      <SubjectSplit />
    </div>
  );
}

window.CalendarScreen = CalendarScreen;
})();
