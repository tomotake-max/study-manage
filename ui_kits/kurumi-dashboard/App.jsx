/* Atelier Mucha kit — App shell: sidebar + topbar + router */
(function () {
const { SideNav, Button, Badge } = window.AtelierMuchaDesignSystem_29c0c4;

const NAV = [
  { id: "home",      label: "ダッシュボード", icon: "layout-dashboard" },
  { id: "mistakes",  label: "間違い直し",     icon: "x-circle" },
  { id: "materials", label: "テキスト・テスト", icon: "book" },
  { id: "calendar",  label: "学習カレンダー", icon: "calendar" },
];

const TITLES = {
  home:      { sub: "Overview · ようこそ", title: "おかえりなさい、くるみさん" },
  mistakes:  { sub: "Mistakes · 間違いノート", title: "間違い直し" },
  add:       { sub: "Mistakes · 新規記録", title: "間違いを追加" },
  materials: { sub: "Library · テキストとテスト", title: "テキスト・テスト" },
  subjects:  { sub: "Subjects · 科目", title: "科目の進捗" },
  calendar:  { sub: "Calendar · 学習記録", title: "学習カレンダー" },
};

function App() {
  const [page, setPage] = React.useState("home");
  const [matSubject, setMatSubject] = React.useState("all");
  const navValue = page === "add" ? "mistakes" : page;
  const m = window.MOCK;

  // (re)build lucide icons after every render
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const go = (p, opts) => {
    if (opts && opts.subject) setMatSubject(opts.subject);
    setPage(p);
  };

  const navItems = NAV.map((n) => ({
    id: n.id,
    label: n.label,
    icon: <Icon name={n.icon} size={18} />,
    badge: n.id === "mistakes" ? m.today.queued : undefined,
  }));

  const subjectNav = (
    <div style={{ padding: "12px 12px 6px", borderTop: "1px solid var(--line)" }}>
      <div className="eyebrow" style={{ padding: "2px 8px 9px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>科目の進捗</span>
        <span style={{ color: "var(--ink-faint)", letterSpacing: 0 }} title="参考書の到達度">参考書の到達度</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {m.subjects.map((s) => {
          const st = window.subjectStats(s.name);
          const open = s.open > 0;
          return (
            <div key={s.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 7px" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.chart, flex: "0 0 auto" }} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{s.name}</span>
                {open && <span title={s.open + "件の直し"} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger, #c0392b)" }} />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {st.materials.filter((mt) => mt.pct < 100).map((mt) => (
                  <button key={mt.id} onClick={() => go("materials", { subject: s.name })} title={mt.title + " · " + mt.sub + " · " + mt.pct + "%"} style={{
                    display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                    background: "transparent", borderRadius: "var(--radius-sm)", padding: "4px 8px",
                    transition: "background var(--dur-fast) var(--ease-organic)",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      <Icon name={mt.type === "serial" ? "calendar-days" : "book"} size={12} color="var(--ink-faint)" />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{mt.title}</span>
                      <span className="tnum" style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>{mt.pct}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: mt.pct + "%", background: s.chart, borderRadius: 3 }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const footer = (
    <React.Fragment>
      {subjectNav}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 12px", borderTop: "1px solid var(--line)" }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gold-soft)", color: "var(--gold-deep)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>く</span>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink)" }}>くるみ</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)" }}>{m.user.grade} · {m.user.course}</div>
        </div>
      </div>
    </React.Fragment>
  );

  let screen;
  if (page === "home") screen = <DashboardScreen go={go} />;
  else if (page === "mistakes") screen = <MistakesScreen go={go} />;
  else if (page === "add") screen = <AddMistakeScreen go={go} />;
  else if (page === "materials") screen = <MaterialsScreen go={go} initialSubject={matSubject} />;
  else if (page === "calendar") screen = <CalendarScreen go={go} />;
  else screen = <ComingSoon page={page} />;

  const t = TITLES[page] || { sub: "", title: "" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--canvas)" }}>
      <SideNav
        items={navItems}
        value={navValue}
        onChange={go}
        header={<Wordmark />}
        footer={footer}
        style={{ minWidth: 244, position: "sticky", top: 0, height: "100vh" }}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar
          title={t.title}
          subtitle={t.sub}
          right={
            <React.Fragment>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-soft)", fontFamily: "var(--font-body)", fontSize: 14 }}>
                <Icon name="calendar-clock" size={16} color="var(--gold-deep)" /> {m.nextTest.name}まで {m.nextTest.daysLeft} 日
              </span>
              <Button variant="primary" size="sm" onClick={() => go("add")}><Icon name="plus" size={15} />&nbsp;記録する</Button>
            </React.Fragment>
          }
        />
        <main style={{ flex: 1, padding: "32px 36px 56px", maxWidth: 1200, width: "100%", boxSizing: "border-box" }}>
          {screen}
        </main>
      </div>
    </div>
  );
}

function ComingSoon({ page }) {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "80px 0", color: "var(--ink-faint)", textAlign: "center" }}>
      <div>
        <Icon name="compass" size={32} />
        <p style={{ fontFamily: "var(--font-body)", marginTop: 12 }}>「{(TITLES[page] || {}).title}」は近日公開。</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
