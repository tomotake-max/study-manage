import { useState } from "react";
import type { DashboardData, SubjectSummary, MaterialBreakdown } from "shared";
import { StudyCalendar } from "../StudyCalendar";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Icon } from "../ui/Icon";
import { ProgressBar } from "../ui/ProgressBar";
import { SectionTitle } from "../chrome/SectionTitle";

function StatRing({ pct, size = 156 }: { pct: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset var(--dur-slow) var(--ease-organic)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "2rem", color: "var(--ink)" }} className="tnum">{pct}%</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)" }}>of goal</span>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        <span className="tnum" style={{ fontSize: "1.3rem", fontWeight: 600 }}>{value}</span>
        <span style={{ fontSize: 12, color: "var(--ink-soft)", marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );
}

function SubjectCard({ subject, materials }: { subject: SubjectSummary; materials: MaterialBreakdown[] }) {
  const [open, setOpen] = useState(false);
  const color = subject.chart;
  const inProgress = materials.filter((m) => m.pct < 100);
  const done = materials.filter((m) => m.pct >= 100);
  return (
    <Card style={{ display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: color }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.2rem", color: "var(--ink)" }}>{subject.name}</span>
        </div>
        {subject.open > 0
          ? <Badge tone="danger">{subject.open} 直し</Badge>
          : <Badge tone="success">直しなし</Badge>}
      </div>

      {/* in-progress — parallel bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, margin: "18px 0 0", flex: 1 }}>
        {inProgress.map((m) => (
          <div key={m.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontFamily: "var(--font-body)" }}>
              <Icon name={m.type === "serial" ? "calendar-days" : "book"} size={14} color={color} />
              <span style={{ fontSize: 14, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{m.title}</span>
              {m.todayDone > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--gold-veil)", color: "var(--gold-deep)", fontSize: 11.5, fontWeight: 600 }}>
                  <Icon name="sparkles" size={11} />+{m.todayDone}
                </span>
              )}
              <span className="tnum" style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600, width: 38, textAlign: "right" }}>{m.pct}%</span>
            </div>
            <ProgressBar value={m.pct} color={color} />
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)", marginTop: 5 }}>{m.sub} · {m.done}/{m.total}問</div>
          </div>
        ))}
      </div>

      {/* completed — toggle */}
      {done.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", borderRadius: "var(--radius-pill)", padding: "5px 12px", background: "var(--surface)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)" }}
          >
            <Icon name="check-circle-2" size={14} color={color} />
            解き終えた参考書 <strong style={{ color: "var(--ink)" }}>{done.length}</strong> 冊
            <Icon name={open ? "chevron-up" : "chevron-down"} size={14} />
          </button>
          {open && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 11 }}>
              {done.map((m) => (
                <span key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", border: "1px solid var(--line)", borderRadius: "var(--radius-pill)", padding: "4px 11px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-soft)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{m.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function Dashboard(props: { data: DashboardData }) {
  const { data } = props;
  const t = data.today;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* hero row */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "stretch" }}>
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 28 }}>
          <div className="eyebrow">本日の進捗 · Today</div>
          <StatRing pct={t.progressPct} />
          <div style={{ display: "flex", gap: 22 }}>
            <Stat label="学習" value={t.minutes} unit="分" />
            <Stat label="目標" value={t.goalMinutes} unit="分" />
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 2 }}>
            <Stat label="直した" value={t.reviewed} unit="件" />
            <Stat label="直し" value={t.queued} unit="件" />
          </div>
        </Card>

        <StudyCalendar calendar={data.calendar} variant="mini" />
      </div>

      {/* subjects */}
      <div>
        <SectionTitle eyebrow="Subjects · 科目別の進捗" title="科目の習得状況" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {data.subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} materials={data.stats[s.id].materials} />
          ))}
        </div>
      </div>
    </div>
  );
}
