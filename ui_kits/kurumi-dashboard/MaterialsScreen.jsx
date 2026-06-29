/* Atelier Mucha kit — Library: テキスト / 復習テスト / 公開テスト */
(function () {
const { Card, Tabs, ProgressBar, Badge, Button } = window.AtelierMuchaDesignSystem_29c0c4;

const subjectOf = (name) => (window.MOCK.subjects.find((s) => s.name === name) || {});

/* ── 教材：問題集タイプ（テーマ別 問数進捗）──────────────────── */
function ThemeRow({ t, chart }) {
  const tp = Math.round((t.done / t.total) * 100);
  const active = t.done > 0 && t.done < t.total;
  const done = t.done >= t.total;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 64px", alignItems: "center", gap: 12 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontSize: 13, color: t.done > 0 ? "var(--ink)" : "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: active ? 600 : 400 }}>
        {done && <Icon name="check" size={12} color="var(--success, var(--chart-3))" />}
        {t.name}
      </span>
      <ProgressBar value={tp} tone={chart} height={6} />
      <span className="tnum" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)", textAlign: "right" }}>{t.done}/{t.total}</span>
    </div>
  );
}

function BookMaterial({ mat, chart }) {
  const totalQ = mat.themes.reduce((a, t) => a + t.total, 0);
  const doneQ  = mat.themes.reduce((a, t) => a + t.done, 0);
  const remain = totalQ - doneQ;
  const pct = Math.round((doneQ / totalQ) * 100);

  const completed = mat.themes.filter((t) => t.done >= t.total);
  const active    = mat.themes.filter((t) => t.done > 0 && t.done < t.total);
  const upcoming  = mat.themes.filter((t) => t.done === 0);
  const [showDone, setShowDone] = React.useState(false);
  // 学習中→未着手 の順。完了は折りたたみ
  const visible = [...active, ...upcoming];

  return (
    <Card interactive style={{ display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: "1.2rem", lineHeight: 1.25 }}>{mat.title}</h3>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-faint)", marginTop: 3 }}>{mat.publisher} · 全{mat.themes.length}テーマ / {totalQ}問</div>
        </div>
        <Badge tone={pct === 100 ? "success" : "gold"}>{pct}%</Badge>
      </div>

      {/* overall */}
      <div style={{ margin: "16px 0 6px" }}>
        <ProgressBar value={pct} tone={chart} />
      </div>
      <div style={{ display: "flex", gap: 18, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 18 }}>
        <span><span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{doneQ}</span> / {totalQ}問</span>
        <span>残り <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{remain}</span>問</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, color: "var(--gold-deep)" }}><Icon name="sparkles" size={13} />今日 +{mat.todayDone}問</span>
      </div>

      {/* active + upcoming */}
      {visible.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {visible.map((t) => <ThemeRow key={t.name} t={t} chart={chart} />)}
        </div>
      )}

      {/* completed — tucked away */}
      {completed.length > 0 && (
        <div style={{ marginTop: visible.length ? 14 : 0, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <button onClick={() => setShowDone((v) => !v)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none",
            background: "transparent", cursor: "pointer", padding: 0,
            fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-soft)",
          }}>
            <Icon name="check-circle-2" size={15} color="var(--gold-deep)" />
            <span>完了したテーマ <strong style={{ color: "var(--ink)" }}>{completed.length}</strong> 件</span>
            <span style={{
              marginLeft: "auto", display: "grid", placeItems: "center",
              width: 22, height: 22, borderRadius: "50%",
              border: "1px solid var(--line-strong)", color: "var(--ink-soft)",
              transition: "all var(--dur-fast) var(--ease-organic)",
            }}>
              <Icon name={showDone ? "minus" : "plus"} size={14} />
            </span>
          </button>
          {showDone && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
              {completed.map((t) => <ThemeRow key={t.name} t={t} chart={chart} />)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── 教材：月刊シリアル（日々の演習）冊数グラフ ────────────────── */
function SerialMaterial({ mat, chart }) {
  const doneVols = mat.volumes.filter((v) => v >= 100).length;
  const volPct = Math.round(mat.volumes.reduce((a, v) => a + v, 0) / (mat.volumesTotal * 100) * 100);
  const cur = mat.current;
  const curPct = Math.round((cur.done / cur.total) * 100);
  const curRemain = cur.total - cur.done;

  return (
    <Card interactive>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: "1.2rem", lineHeight: 1.25 }}>{mat.title}</h3>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-faint)", marginTop: 3 }}>{mat.publisher} · 全{mat.volumesTotal}冊</div>
        </div>
        <Badge tone="info">{cur.label}</Badge>
      </div>

      {/* current month */}
      <div style={{ background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "14px 16px", margin: "16px 0 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--ink)" }}>今月の単元：<strong>{cur.unit}</strong></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--gold-deep)" }}><Icon name="sparkles" size={12} />今日 +{mat.todayDone}問</span>
        </div>
        <ProgressBar value={curPct} tone={chart} />
        <div style={{ display: "flex", gap: 16, marginTop: 7, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)" }}>
          <span><span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{cur.done}</span>/{cur.total}問</span>
          <span>この号 残り <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{curRemain}</span>問</span>
        </div>
      </div>

      {/* volume completion graph */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <span className="eyebrow">冊数の進捗</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)" }}>
          <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{doneVols}</span> / {mat.volumesTotal}冊 完了 · 残り <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{mat.volumesTotal - doneVols}</span>冊
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + mat.volumesTotal + ", 1fr)", alignItems: "end", gap: 3, height: 56 }}>
        {mat.volumes.map((v, i) => (
          <div key={i} title={"第" + (i + 1) + "号 · " + v + "%"} style={{
            height: Math.max(8, v) + "%", minHeight: 4, borderRadius: 2,
            background: v >= 100 ? chart : v > 0 ? "var(--gold)" : "var(--line)",
          }} />
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <ProgressBar value={volPct} tone={chart} height={6} />
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)", marginTop: 5, textAlign: "right" }}>全体 {volPct}% 達成</div>
      </div>
    </Card>
  );
}

/* 教材が修了済みか（問題集＝全テーマ完了 / シリアル＝全冊完了）*/
function isMatDone(mat) {
  if (mat.type === "serial") return mat.volumes.filter((v) => v >= 100).length >= mat.volumesTotal;
  return mat.themes.every((t) => t.done >= t.total);
}

function MatCard({ mat, chart }) {
  return mat.type === "serial"
    ? <SerialMaterial mat={mat} chart={chart} />
    : <BookMaterial mat={mat} chart={chart} />;
}

/* 科目ごとの教材グループ（修了済みは折りたたみ・既定で閉）*/
function SubjectTextsGroup({ s, mats }) {
  const active = mats.filter((mat) => !isMatDone(mat));
  const done = mats.filter((mat) => isMatDone(mat));
  const [showDone, setShowDone] = React.useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: s.chart }} />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.2rem", color: "var(--ink)" }}>{s.name}</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)" }}>取り組み中 {active.length} 冊</span>
      </div>

      {active.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 18 }}>
          {active.map((mat) => <MatCard key={mat.id} mat={mat} chart={s.chart} />)}
        </div>
      )}

      {done.length > 0 && (
        <div style={{ marginTop: active.length ? 16 : 0 }}>
          <button onClick={() => setShowDone((v) => !v)} style={{
            display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
            border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer",
            borderRadius: "var(--radius-md)", padding: "12px 16px",
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-soft)",
            transition: "background var(--dur-fast) var(--ease-organic)",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}>
            <Icon name="check-circle-2" size={16} color="var(--gold-deep)" />
            <span>解き終えた参考書 <strong style={{ color: "var(--ink)" }}>{done.length}</strong> 冊</span>
            <span style={{
              marginLeft: "auto", display: "grid", placeItems: "center",
              width: 24, height: 24, borderRadius: "50%",
              border: "1px solid var(--line-strong)", color: "var(--ink-soft)",
            }}>
              <Icon name={showDone ? "minus" : "plus"} size={15} />
            </span>
          </button>
          {showDone && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 18, marginTop: 16 }}>
              {done.map((mat) => <MatCard key={mat.id} mat={mat} chart={s.chart} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── テキスト：科目 → 教材（テキスト名）→ テーマ/問数の進捗 ──── */
function TextsView({ subject }) {
  const m = window.MOCK;
  const subs = subject === "all" ? m.subjects : m.subjects.filter((s) => s.name === subject);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      {subs.map((s) => {
        const mats = m.texts.filter((t) => t.subject === s.name);
        if (!mats.length) return null;
        return <SubjectTextsGroup key={s.id} s={s} mats={mats} />;
      })}
    </div>
  );
}

/* ── テスト：復習テスト・公開テストの結果リスト ─────────────── */
function TestsView({ kind, subject }) {
  const m = window.MOCK;
  const isOpen = kind === "公開テスト";
  const rows = m.tests.filter((t) => t.kind === kind && (isOpen || subject === "all" || t.subject === subject));
  return (
    <Card style={{ padding: 0 }}>
      {rows.map((t, i) => {
        const showSub = isOpen && subject !== "all";
        const s = subjectOf(showSub ? subject : t.subject);
        const metric = isOpen ? (showSub ? t.subjectDev[subject] : t.deviation) : t.score;
        const metricLabel = isOpen ? (showSub ? subject + " 偏差値" : "総合 偏差値") : "得点";
        const tone = isOpen ? (metric >= 56 ? "success" : "gold")
                            : (t.score >= 80 ? "success" : t.score >= 65 ? "gold" : "danger");
        const subLabel = showSub ? subject : t.subject;
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 22px", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
            <span style={{ width: 40, height: 40, flex: "0 0 auto", borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--gold-veil)", color: "var(--gold-deep)" }}>
              <Icon name={isOpen ? "award" : "repeat-2"} size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, color: "var(--ink)", fontSize: 15.5 }}>{t.name}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-faint)" }}>
                  {(!isOpen || showSub) && <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.chart || "var(--ink-faint)" }} />}
                  {subLabel}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)", marginTop: 3 }}>範囲：{t.range} · {t.date}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.5rem", color: "var(--ink)", lineHeight: 1 }}>{metric}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{metricLabel}</div>
            </div>
            <Badge tone={tone}>{t.done ? "見直しずみ" : "見直す"}</Badge>
          </div>
        );
      })}
      {rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-faint)", fontFamily: "var(--font-body)" }}>まだ結果がありません。</div>
      )}
    </Card>
  );
}

function MaterialsScreen({ go, initialSubject }) {
  const m = window.MOCK;
  const [cat, setCat] = React.useState("テキスト");
  const [subject, setSubject] = React.useState(initialSubject || "all");
  React.useEffect(() => { setSubject(initialSubject || "all"); }, [initialSubject]);
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); }, [cat, subject]);
  const tn = (c) => c === "テキスト" ? m.texts.length : m.tests.filter((t) => t.kind === c).length;
  const subjects = ["all", ...m.subjects.map((s) => s.name)];

  return (
    <div>
      <SectionTitle
        eyebrow="Library · テキストとテスト"
        title="教材ライブラリ"
        action={<Button variant="secondary" size="sm"><Icon name="plus" size={15} />&nbsp;追加</Button>}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ minWidth: 360, flex: "0 1 460px" }}>
          <Tabs
            value={cat}
            onChange={setCat}
            tabs={m.categories.map((c) => ({ value: c, label: c, count: tn(c) }))}
          />
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {subjects.map((sName) => {
            const sObj = m.subjects.find((s) => s.name === sName);
            const active = subject === sName;
            return (
              <button key={sName} onClick={() => setSubject(sName)} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                border: "1px solid " + (active ? "var(--gold)" : "var(--line)"),
                background: active ? "var(--gold-veil)" : "var(--surface)",
                color: active ? "var(--gold-deep)" : "var(--ink-soft)",
                borderRadius: "var(--radius-pill)", padding: "5px 13px", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: 13,
              }}>
                {sObj && <span style={{ width: 8, height: 8, borderRadius: "50%", background: sObj.chart }} />}
                {sName === "all" ? "全科目" : sName}
              </button>
            );
          })}
        </div>
      </div>

      {cat === "テキスト"
        ? <TextsView subject={subject} />
        : <TestsView kind={cat} subject={subject} />}
    </div>
  );
}

window.MaterialsScreen = MaterialsScreen;
})();
