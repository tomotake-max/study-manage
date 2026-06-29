import { useEffect, useState } from "react";
import type React from "react";
import type { DashboardData, SubjectName, SubjectSummary, TextMaterial, Theme } from "shared";
import { SUBJECT_COLORS } from "shared";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Pill } from "../ui/Pill";
import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { SectionTitle } from "../chrome/SectionTitle";

const SUBJECTS: SubjectName[] = ["算数", "国語", "理科", "社会"];

/* ── テーマ行 ─────────────────────────── */
function ThemeRow({ t, color }: { t: Theme; color: string }) {
  const tp = Math.round((t.done / t.total) * 100);
  const active = t.done > 0 && t.done < t.total;
  const done = t.done >= t.total;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 64px", alignItems: "center", gap: 12 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontSize: 13, color: t.done > 0 ? "var(--ink)" : "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: active ? 600 : 400 }}>
        {done && <Icon name="check" size={12} color="var(--success)" />}
        {t.name}
      </span>
      <ProgressBar value={tp} color={color} height={6} />
      <span className="tnum" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)", textAlign: "right" }}>{t.done}/{t.total}</span>
    </div>
  );
}

/* ── 教材：問題集タイプ ─────────────────── */
function BookCard({ mat, color }: { mat: TextMaterial; color: string }) {
  const themes = mat.themes ?? [];
  const totalQ = themes.reduce((a, t) => a + t.total, 0);
  const doneQ = themes.reduce((a, t) => a + t.done, 0);
  const remain = totalQ - doneQ;
  const pct = totalQ > 0 ? Math.round((doneQ / totalQ) * 100) : 0;

  const completed = themes.filter((t) => t.done >= t.total);
  const active = themes.filter((t) => t.done > 0 && t.done < t.total);
  const upcoming = themes.filter((t) => t.done === 0);
  const [showDone, setShowDone] = useState(false);
  const visible = [...active, ...upcoming];

  return (
    <Card style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: "1.2rem", lineHeight: 1.25 }}>{mat.title}</h3>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-faint)", marginTop: 3 }}>{mat.publisher} · 全{themes.length}テーマ / {totalQ}問</div>
        </div>
        <Badge tone={pct === 100 ? "success" : "gold"}>{pct}%</Badge>
      </div>

      <div style={{ margin: "16px 0 6px" }}>
        <ProgressBar value={pct} color={color} />
      </div>
      <div style={{ display: "flex", gap: 18, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 18 }}>
        <span><span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{doneQ}</span> / {totalQ}問</span>
        <span>残り <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{remain}</span>問</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, color: "var(--gold-deep)" }}><Icon name="sparkles" size={13} />今日 +{mat.todayDone}問</span>
      </div>

      {visible.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {visible.map((t) => <ThemeRow key={t.name} t={t} color={color} />)}
        </div>
      )}

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
            }}>
              <Icon name={showDone ? "minus" : "plus"} size={14} />
            </span>
          </button>
          {showDone && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
              {completed.map((t) => <ThemeRow key={t.name} t={t} color={color} />)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── 教材：月刊シリアルタイプ ─────────────── */
function SerialCard({ mat, color }: { mat: TextMaterial; color: string }) {
  const volumes = mat.volumes ?? [];
  const volumesTotal = mat.volumesTotal ?? volumes.length;
  const doneVols = volumes.filter((v) => v >= 100).length;
  const volPct = volumesTotal > 0 ? Math.round((volumes.reduce((a, v) => a + v, 0) / (volumesTotal * 100)) * 100) : 0;
  const cur = mat.current ?? { label: "", unit: "", total: 0, done: 0 };
  const curPct = cur.total > 0 ? Math.round((cur.done / cur.total) * 100) : 0;
  const curRemain = cur.total - cur.done;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: "1.2rem", lineHeight: 1.25 }}>{mat.title}</h3>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-faint)", marginTop: 3 }}>{mat.publisher} · 全{volumesTotal}冊</div>
        </div>
        <Badge tone="neutral">{cur.label}</Badge>
      </div>

      <div style={{ background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "14px 16px", margin: "16px 0 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--ink)" }}>今月の単元：<strong>{cur.unit}</strong></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--gold-deep)" }}><Icon name="sparkles" size={12} />今日 +{mat.todayDone}問</span>
        </div>
        <ProgressBar value={curPct} color={color} />
        <div style={{ display: "flex", gap: 16, marginTop: 7, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)" }}>
          <span><span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{cur.done}</span>/{cur.total}問</span>
          <span>この号 残り <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{curRemain}</span>問</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <span className="eyebrow">冊数の進捗</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)" }}>
          <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{doneVols}</span> / {volumesTotal}冊 完了 · 残り <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600 }}>{volumesTotal - doneVols}</span>冊
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${volumesTotal}, 1fr)`, alignItems: "end", gap: 3, height: 56 }}>
        {volumes.map((v, i) => (
          <div key={i} title={`第${i + 1}号 · ${v}%`} style={{
            height: Math.max(8, v) + "%", minHeight: 4, borderRadius: 2,
            background: v >= 100 ? color : v > 0 ? "var(--gold)" : "var(--line)",
          }} />
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <ProgressBar value={volPct} color={color} height={6} />
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)", marginTop: 5, textAlign: "right" }}>全体 {volPct}% 達成</div>
      </div>
    </Card>
  );
}

function MatCard({ mat, color }: { mat: TextMaterial; color: string }) {
  return mat.materialType === "serial"
    ? <SerialCard mat={mat} color={color} />
    : <BookCard mat={mat} color={color} />;
}

function isMatDone(mat: TextMaterial): boolean {
  if (mat.materialType === "serial") {
    const volumes = mat.volumes ?? [];
    const volumesTotal = mat.volumesTotal ?? volumes.length;
    return volumes.filter((v) => v >= 100).length >= volumesTotal && volumesTotal > 0;
  }
  const themes = mat.themes ?? [];
  return themes.length > 0 && themes.every((t) => t.done >= t.total);
}

const GRID: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 18 };

/* ── 科目グループ ─────────────────────── */
function SubjectTextsGroup({ s, mats }: { s: SubjectSummary; mats: TextMaterial[] }) {
  const active = mats.filter((mat) => !isMatDone(mat));
  const done = mats.filter((mat) => isMatDone(mat));
  const [showDone, setShowDone] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: s.chart }} />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.2rem", color: "var(--ink)" }}>{s.name}</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)" }}>取り組み中 {active.length} 冊</span>
      </div>

      {active.length > 0 && (
        <div style={GRID}>
          {active.map((mat) => <MatCard key={mat.id} mat={mat} color={s.chart} />)}
        </div>
      )}

      {done.length > 0 && (
        <div style={{ marginTop: active.length ? 16 : 0 }}>
          <button onClick={() => setShowDone((v) => !v)} style={{
            display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
            border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer",
            borderRadius: "var(--radius-md)", padding: "12px 16px",
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-soft)",
          }}>
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
            <div style={{ ...GRID, marginTop: 16 }}>
              {done.map((mat) => <MatCard key={mat.id} mat={mat} color={s.chart} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── テキストタブ ─────────────────────── */
function TextsView({ data, subject }: { data: DashboardData; subject: string }) {
  const subs = subject === "all" ? data.subjects : data.subjects.filter((s) => s.name === subject);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      {subs.map((s) => {
        const mats = data.texts.filter((t) => t.subject === s.name);
        if (!mats.length) return null;
        return <SubjectTextsGroup key={s.id} s={s} mats={mats} />;
      })}
    </div>
  );
}

/* ── テストタブ ───────────────────────── */
function TestsView({ data, kind, subject }: { data: DashboardData; kind: "復習テスト" | "公開テスト"; subject: string }) {
  const isOpen = kind === "公開テスト";
  const rows = data.tests.filter((t) => t.kind === kind && (isOpen || subject === "all" || t.subject === subject));
  return (
    <Card style={{ padding: 0 }}>
      {rows.map((t, i) => {
        const showSub = isOpen && subject !== "all";
        const dotColor = (showSub ? subject : t.subject) in SUBJECT_COLORS
          ? SUBJECT_COLORS[(showSub ? subject : t.subject) as SubjectName]
          : "var(--ink-faint)";
        let metric: number | undefined;
        let metricLabel: string;
        if (isOpen) {
          metric = showSub ? t.subjectDev?.[subject as SubjectName] : t.deviation;
          metricLabel = showSub ? `${subject} 偏差値` : "総合 偏差値";
        } else {
          metric = t.score;
          metricLabel = "得点";
        }
        const tone = isOpen
          ? ((metric ?? 0) >= 56 ? "success" : "gold")
          : ((t.score ?? 0) >= 80 ? "success" : (t.score ?? 0) >= 65 ? "gold" : "danger");
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
                  {(!isOpen || showSub) && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor }} />}
                  {subLabel}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)", marginTop: 3 }}>範囲：{t.range} · {t.date}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.5rem", color: "var(--ink)", lineHeight: 1 }}>{metric ?? "—"}</div>
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

/* ── カテゴリタブ ─────────────────────── */
function CategoryTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px",
      border: "1px solid " + (active ? "var(--gold)" : "var(--line)"),
      background: active ? "var(--gold-veil)" : "var(--surface)",
      color: active ? "var(--gold-deep)" : "var(--ink-soft)",
      borderRadius: "var(--radius-pill)", cursor: "pointer",
      fontFamily: "var(--font-body)", fontSize: 14, fontWeight: active ? 600 : 400,
    }}>
      {label}
      <span className="tnum" style={{ fontSize: 12, color: active ? "var(--gold-deep)" : "var(--ink-faint)" }}>{count}</span>
    </button>
  );
}

export function Materials(props: { data: DashboardData; subject: string }) {
  const { data } = props;
  const [cat, setCat] = useState<string>("テキスト");
  const [subject, setSubject] = useState<string>(props.subject || "all");
  useEffect(() => { setSubject(props.subject || "all"); }, [props.subject]);

  const tn = (c: string) => (c === "テキスト" ? data.texts.length : data.tests.filter((t) => t.kind === c).length);
  const subjectPills: string[] = ["all", ...SUBJECTS];

  return (
    <div>
      <SectionTitle
        eyebrow="Library · テキストとテスト"
        title="教材ライブラリ"
        action={<Button variant="outline" size="sm" iconLeft={<Icon name="plus" size={15} />}>追加</Button>}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.categories.map((c) => (
            <CategoryTab key={c} label={c} count={tn(c)} active={cat === c} onClick={() => setCat(c)} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {subjectPills.map((sName) => (
            <Pill
              key={sName}
              active={subject === sName}
              color={sName === "all" ? undefined : SUBJECT_COLORS[sName as SubjectName]}
              onClick={() => setSubject(sName)}
            >
              {sName === "all" ? "全科目" : sName}
            </Pill>
          ))}
        </div>
      </div>

      {cat === "テキスト"
        ? <TextsView data={data} subject={subject} />
        : <TestsView data={data} kind={cat as "復習テスト" | "公開テスト"} subject={subject} />}
    </div>
  );
}
