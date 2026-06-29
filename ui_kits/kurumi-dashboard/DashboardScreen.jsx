/* Atelier Mucha kit — Dashboard / Overview screen */
(function () {
const { Card, StatRing, Stat, ProgressBar, Badge, Button, HaloDivider } =
  window.AtelierMuchaDesignSystem_29c0c4;

function DashboardScreen({ go }) {
  const m = window.MOCK;
  const t = m.today;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* hero row */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "stretch" }}>
        <Card accent style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 28 }}>
          <div className="eyebrow">本日の進捗 · Today</div>
          <StatRing value={t.progressPct + "%"} caption="of goal" progress={t.progressPct / 100} size={156} />
          <div style={{ display: "flex", gap: 22 }}>
            <Stat label="学習" value={t.minutes} unit="分" />
            <Stat label="目標" value={t.goalMinutes} unit="分" />
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 2 }}>
            <Stat label="解いた" value={m.calendar.days[m.calendar.today].q} unit="問" />
            <Stat label="直し" value={t.queued} unit="件" />
          </div>
        </Card>

        <StudyCalendar />
      </div>

      {/* subjects */}
      <div>
        <SectionTitle
          eyebrow="Subjects · 科目別の進捗"
          title="科目の習得状況"
          action={<Button variant="ghost" size="sm" onClick={() => go("materials")}>教材を見る&nbsp;<Icon name="arrow-right" size={15} /></Button>}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {m.subjects.map((s) => {
            const st = window.subjectStats(s.name);
            const inProgress = st.materials.filter((mt) => mt.pct < 100);
            const done = st.materials.filter((mt) => mt.pct >= 100);
            return (
              <Card key={s.id} interactive style={{ cursor: "pointer", display: "flex", flexDirection: "column" }} onClick={() => go("materials", { subject: s.name })}>
                {/* header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 11, height: 11, borderRadius: "50%", background: s.chart }} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.2rem", color: "var(--ink)" }}>{s.name}</span>
                  </div>
                  {s.open > 0
                    ? <Badge tone="danger"><span style={{ whiteSpace: "nowrap" }}>{s.open} 直し</span></Badge>
                    : <Badge tone="success"><span style={{ whiteSpace: "nowrap" }}>直しなし</span></Badge>}
                </div>

                {/* in-progress — parallel bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, margin: "18px 0 0", flex: 1 }}>
                  {inProgress.map((mt) => (
                    <div key={mt.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontFamily: "var(--font-body)" }}>
                        <Icon name={mt.type === "serial" ? "calendar-days" : "book"} size={14} color={s.chart} />
                        <span style={{ fontSize: 14, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{mt.title}</span>
                        {mt.todayDone > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--gold-veil)", color: "var(--gold-deep)", fontSize: 11.5, fontWeight: 600 }}>
                            <Icon name="sparkles" size={11} />+{mt.todayDone}
                          </span>
                        )}
                        <span className="tnum" style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600, width: 38, textAlign: "right" }}>{mt.pct}%</span>
                      </div>
                      <ProgressBar value={mt.pct} tone={s.chart} />
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)", marginTop: 5 }}>{mt.sub} · {mt.done}/{mt.total}問</div>
                    </div>
                  ))}
                </div>

                {/* completed — which books are finished */}
                {done.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 9 }}>
                      <Icon name="check-circle-2" size={14} color={s.chart} />
                      解き終えた参考書 <strong style={{ color: "var(--ink)" }}>{done.length}</strong> 冊
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {done.map((mt) => (
                        <span key={mt.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", border: "1px solid var(--line)", borderRadius: "var(--radius-pill)", padding: "4px 11px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.chart }} />{mt.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* review queue */}
      <div>
        <SectionTitle
          eyebrow="Review queue · 今日見直す"
          title="間違い直しキュー"
          action={<Button variant="ghost" size="sm" onClick={() => go("mistakes")}>すべて見る&nbsp;<Icon name="arrow-right" size={15} /></Button>}
        />
        <Card style={{ padding: 0 }}>
          {m.mistakes.filter((x) => !x.done).slice(0, 4).map((x, i, arr) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 22px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", flex: "0 0 auto" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-body)", color: "var(--ink)", fontSize: 15 }}>{x.q}</div>
                <div style={{ fontFamily: "var(--font-body)", color: "var(--ink-faint)", fontSize: 13, marginTop: 2 }}>{x.subject} · {x.source}</div>
              </div>
              <Badge tone="warning">{x.reason}</Badge>
              <span className="tnum" style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)", fontSize: 13 }}>×{x.count}</span>
              <Button size="sm" variant="secondary" onClick={() => go("mistakes")}>直す</Button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
})();
