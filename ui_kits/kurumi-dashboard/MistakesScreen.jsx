/* Atelier Mucha kit — Mistakes log (間違い直し) with detail panel */
(function () {
const { Card, Tabs, DataTable, Badge, Button, HaloDivider } =
  window.AtelierMuchaDesignSystem_29c0c4;

function MistakesScreen({ go }) {
  const m = window.MOCK;
  const [tab, setTab] = React.useState("open");
  const [subject, setSubject] = React.useState("all");
  const [selected, setSelected] = React.useState(m.mistakes[0]);

  const subjects = ["all", ...m.subjects.map((s) => s.name)];
  const filtered = m.mistakes.filter((x) =>
    (tab === "all" || (tab === "open" ? !x.done : x.done)) &&
    (subject === "all" || x.subject === subject)
  );

  const counts = {
    all: m.mistakes.length,
    open: m.mistakes.filter((x) => !x.done).length,
    done: m.mistakes.filter((x) => x.done).length,
  };

  const columns = [
    { key: "q", label: "間違えた問題", render: (r) => (
      <div>
        <div style={{ color: "var(--ink)" }}>{r.q}</div>
        <div style={{ color: "var(--ink-faint)", fontSize: 12, marginTop: 2 }}>{r.source}</div>
      </div>
    ) },
    { key: "subject", label: "科目", render: (r) => {
      const s = m.subjects.find((s) => s.name === r.subject);
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: s ? s.chart : "var(--ink-faint)" }} />{r.subject}</span>;
    } },
    { key: "reason", label: "理由", render: (r) => <Badge tone="warning">{r.reason}</Badge> },
    { key: "count", label: "回数", align: "right", tnum: true, render: (r) => "×" + r.count },
    { key: "status", label: "", align: "right", render: (r) => r.done ? <Badge tone="success">直し済</Badge> : <Badge tone="danger">未</Badge> },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 24, alignItems: "start" }}>
      <div>
        <SectionTitle
          eyebrow="Mistakes log · 間違いノート"
          title="間違い直し"
          action={<Button variant="primary" size="sm" onClick={() => go("add")}><Icon name="plus" size={15} />&nbsp;間違いを追加</Button>}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "open", label: "未直し", count: counts.open },
                { value: "done", label: "直し済", count: counts.done },
                { value: "all", label: "すべて", count: counts.all },
              ]}
            />
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {subjects.map((s) => (
              <button key={s} onClick={() => setSubject(s)} style={{
                border: "1px solid " + (subject === s ? "var(--gold)" : "var(--line)"),
                background: subject === s ? "var(--gold-veil)" : "var(--surface)",
                color: subject === s ? "var(--gold-deep)" : "var(--ink-soft)",
                borderRadius: "var(--radius-pill)", padding: "5px 13px", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: 13,
              }}>{s === "all" ? "全科目" : s}</button>
            ))}
          </div>
        </div>

        <Card style={{ padding: "8px 6px" }}>
          <DataTable
            columns={columns}
            rows={filtered}
            onRowClick={setSelected}
          />
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-faint)", fontFamily: "var(--font-body)" }}>
              この条件の間違いはありません。
            </div>
          )}
        </Card>
      </div>

      {selected && <MistakeDetail item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MistakeDetail({ item, onClose }) {
  const m = window.MOCK;
  const s = m.subjects.find((s) => s.name === item.subject);
  return (
    <Card accent style={{ position: "sticky", top: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="eyebrow">Mistake · 詳細</span>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)", display: "inline-flex" }}><Icon name="x" size={18} /></button>
      </div>

      <h3 style={{ fontSize: "1.2rem", lineHeight: 1.35, marginBottom: 10 }}>{item.q}</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--ink-soft)", fontSize: 13, fontFamily: "var(--font-body)" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: s ? s.chart : "var(--ink-faint)" }} />
        {item.subject} · {item.source}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
        {item.category && <Badge tone="info">{item.category}</Badge>}
        {item.unit && <Badge tone="neutral">単元：{item.unit}</Badge>}
        {item.theme && <Badge tone="neutral">{item.theme}</Badge>}
      </div>

      {/* uploaded problem image placeholder */}
      <div style={{ border: "1px dashed var(--line-strong)", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", height: 132, display: "grid", placeItems: "center", color: "var(--ink-faint)", marginBottom: 18 }}>
        <div style={{ textAlign: "center", fontFamily: "var(--font-body)", fontSize: 13 }}>
          <Icon name="image" size={22} /><div style={{ marginTop: 6 }}>問題の写真</div>
        </div>
      </div>

      <HaloDivider />

      <div style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>理由 · Reason</div>
        <Badge tone="warning">{item.reason}</Badge>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>わからなかったところ</div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.65, color: "var(--ink)", margin: 0 }}>{item.note}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <span className="tnum" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)" }}>間違い {item.count} 回 · {item.date}</span>
        {item.done
          ? <Badge tone="success">直し済</Badge>
          : <Button size="sm" variant="primary">直したことにする</Button>}
      </div>
    </Card>
  );
}

window.MistakesScreen = MistakesScreen;
})();
