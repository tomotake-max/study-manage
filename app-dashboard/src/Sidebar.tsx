import { useState } from "react";
import type { DashboardData, SubjectName } from "shared";
import { SUBJECT_IDS } from "shared";
import { Wordmark } from "./chrome/Wordmark";
import { SideNav } from "./ui/SideNav";
import { Icon } from "./ui/Icon";

const NAV = [
  { id: "home", label: "ダッシュボード", icon: "layout-dashboard" },
  { id: "mistakes", label: "間違い直し", icon: "x-circle" },
  { id: "materials", label: "テキスト・テスト", icon: "book" },
  { id: "calendar", label: "学習カレンダー", icon: "calendar" },
];

function MaterialRow({
  title,
  type,
  pct,
  chart,
  onClick,
}: {
  title: string;
  type: "book" | "serial";
  pct: number;
  chart: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={`${title} · ${pct}%`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "none",
        cursor: "pointer",
        background: hover ? "var(--surface-sunken)" : "transparent",
        borderRadius: "var(--radius-sm)",
        padding: "4px 8px",
        transition: "background var(--dur-fast) var(--ease-organic)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <Icon name={type === "serial" ? "calendar-days" : "book"} size={12} color="var(--ink-faint)" />
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
          }}
        >
          {title}
        </span>
        <span className="tnum" style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: chart, borderRadius: 3 }} />
      </div>
    </button>
  );
}

export function Sidebar({
  data,
  page,
  onNavigate,
  onSubjectClick,
}: {
  data: DashboardData;
  page: string;
  onNavigate: (page: string) => void;
  onSubjectClick: (subject: SubjectName) => void;
}) {
  const navValue = page === "add" ? "mistakes" : page;

  const navItems = NAV.map((n) => ({
    id: n.id,
    label: n.label,
    icon: <Icon name={n.icon} size={18} />,
    badge: n.id === "mistakes" ? data.today.queued : undefined,
  }));

  return (
    <aside
      style={{
        width: 260,
        flex: "0 0 260px",
        borderRight: "1px solid var(--line)",
        background: "var(--canvas)",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "18px 16px 6px" }}>
        <Wordmark />
      </div>

      <SideNav items={navItems} value={navValue} onChange={onNavigate} />

      <div style={{ padding: "12px 12px 6px", borderTop: "1px solid var(--line)" }}>
        <div
          className="eyebrow"
          style={{ padding: "2px 8px 9px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>科目の進捗</span>
          <span style={{ color: "var(--ink-faint)", letterSpacing: 0 }} title="参考書の到達度">
            参考書の到達度
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {data.subjects.map((s) => {
            const st = data.stats[SUBJECT_IDS[s.name]];
            const open = s.open > 0;
            return (
              <div key={s.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 7px" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.chart, flex: "0 0 auto" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{s.name}</span>
                  {open && (
                    <span
                      title={`${s.open}件の直し`}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger, #c0392b)" }}
                    />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {st.materials
                    .filter((mt) => mt.pct < 100)
                    .map((mt) => (
                      <MaterialRow
                        key={mt.id}
                        title={mt.title}
                        type={mt.type}
                        pct={mt.pct}
                        chart={s.chart}
                        onClick={() => onSubjectClick(s.name)}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "12px 12px",
          borderTop: "1px solid var(--line)",
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--gold-soft)",
            color: "var(--gold-deep)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 17,
          }}
        >
          く
        </span>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink)" }}>{data.user.name}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-faint)" }}>
            {data.user.grade} · {data.user.course}
          </div>
        </div>
      </div>
    </aside>
  );
}
