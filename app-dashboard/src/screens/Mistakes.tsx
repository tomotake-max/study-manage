import { useState } from "react";
import type { DashboardData, MistakeNote, SubjectName } from "shared";
import { SUBJECT_COLORS } from "shared";
import { SectionTitle } from "../chrome/SectionTitle";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Pill } from "../ui/Pill";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

const SUBJECTS: SubjectName[] = ["算数", "国語", "理科", "社会"];

export function Mistakes(props: { data: DashboardData; onAdd: () => void }) {
  const { mistakes } = props.data;
  const [subject, setSubject] = useState<"all" | SubjectName>("all");
  const [selectedId, setSelectedId] = useState<string | null>(mistakes[0]?.id ?? null);

  const filtered = mistakes.filter((m) => subject === "all" || m.subject === subject);
  const selected = mistakes.find((m) => m.id === selectedId) ?? null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 24, alignItems: "start" }}>
      <div>
        <SectionTitle
          eyebrow="Mistakes log · 間違いノート"
          title="間違い直し"
          action={
            <Button variant="solid" size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={props.onAdd}>
              間違いを追加
            </Button>
          }
        />

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          <Pill active={subject === "all"} onClick={() => setSubject("all")}>
            全科目
          </Pill>
          {SUBJECTS.map((s) => (
            <Pill key={s} active={subject === s} color={SUBJECT_COLORS[s]} onClick={() => setSubject(s)}>
              {s}
            </Pill>
          ))}
        </div>

        <Card style={{ padding: "6px 6px" }}>
          {filtered.map((m) => (
            <MistakeRow
              key={m.id}
              item={m}
              active={m.id === selectedId}
              onClick={() => setSelectedId(m.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-faint)", fontFamily: "var(--font-body)" }}>
              この条件の間違いはありません。
            </div>
          )}
        </Card>
      </div>

      {selected && <MistakeDetail item={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function MistakeRow({ item, active, onClick }: { item: MistakeNote; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        border: "none",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--gold-veil)" : "transparent",
        padding: "12px 12px",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        transition: "background var(--dur-fast) var(--ease-organic)",
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: SUBJECT_COLORS[item.subject],
          flex: "0 0 auto",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--ink)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.question}
        </div>
        <div style={{ color: "var(--ink-faint)", fontSize: 12, marginTop: 2 }}>{item.source}</div>
      </div>
      <span className="tnum" style={{ color: "var(--ink-soft)", fontSize: 13, flex: "0 0 auto" }}>
        ×{item.count}
      </span>
      <span className="tnum" style={{ color: "var(--ink-faint)", fontSize: 12, flex: "0 0 auto", width: 44, textAlign: "right" }}>
        {item.date}
      </span>
      <span style={{ flex: "0 0 auto" }}>
        {item.done ? <Badge tone="success">直しずみ</Badge> : <Badge tone="danger">直す</Badge>}
      </span>
    </button>
  );
}

function MistakeDetail({ item, onClose }: { item: MistakeNote; onClose: () => void }) {
  return (
    <Card style={{ position: "sticky", top: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="eyebrow">Mistake · 詳細</span>
        <button
          type="button"
          onClick={onClose}
          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)", display: "inline-flex" }}
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      <h3 style={{ fontSize: "1.2rem", lineHeight: 1.35, marginBottom: 10 }}>{item.question}</h3>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          color: "var(--ink-soft)",
          fontSize: 13,
          fontFamily: "var(--font-body)",
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: SUBJECT_COLORS[item.subject] }} />
        {item.subject} · {item.source}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
        <Badge tone="gold">{item.category}</Badge>
        {item.unit && <Badge tone="neutral">単元：{item.unit}</Badge>}
        {item.theme && <Badge tone="neutral">{item.theme}</Badge>}
      </div>

      <div
        style={{
          border: "1px dashed var(--line-strong)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface-sunken)",
          height: 132,
          display: "grid",
          placeItems: "center",
          color: "var(--ink-faint)",
          marginBottom: 18,
        }}
      >
        <div style={{ textAlign: "center", fontFamily: "var(--font-body)", fontSize: 13 }}>
          <Icon name="image" size={22} />
          <div style={{ marginTop: 6 }}>問題の写真</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>理由 · Reason</div>
        <Badge tone="gold">{item.reason}</Badge>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>わからなかったところ</div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.65, color: "var(--ink)", margin: 0 }}>
          {item.note}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
        }}
      >
        <span className="tnum" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)" }}>
          間違い {item.count} 回 · {item.date}
        </span>
        {item.done ? <Badge tone="success">直しずみ</Badge> : <Badge tone="danger">直す</Badge>}
      </div>
    </Card>
  );
}
