import { useState } from "react";
import type { DashboardData, MistakeNote, SubjectName } from "shared";
import { SUBJECT_COLORS } from "shared";
import { setMistakeGroupApi } from "../api";
import { SectionTitle } from "../chrome/SectionTitle";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Pill } from "../ui/Pill";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

const SUBJECTS: SubjectName[] = ["算数", "国語", "理科", "社会"];

function getDisplayTitle(item: MistakeNote): string {
  if (item.category === "テキスト") return item.question;
  return [item.theme, item.source, item.subject, item.question].filter(Boolean).join("・");
}

export function Mistakes(props: {
  data: DashboardData;
  onAdd: () => void;
  onDataChange: (updater: (d: DashboardData) => DashboardData) => void;
  reload: () => void;
}) {
  const { mistakes } = props.data;
  const [subject, setSubject] = useState<"all" | SubjectName>("all");
  const [groupTab, setGroupTab] = useState<1 | 2>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = mistakes.filter(
    (m) => m.group === groupTab && (subject === "all" || m.subject === subject),
  );
  const selected = mistakes.find((m) => m.id === selectedId) ?? null;

  async function moveGroup(id: string, group: 1 | 2) {
    if (pendingId === id) return;
    setPendingId(id);
    try {
      await setMistakeGroupApi(id, group);
      props.onDataChange((d) => ({
        ...d,
        mistakes: d.mistakes.map((m) => (m.id === id ? { ...m, group } : m)),
      }));
      if (selectedId === id) setSelectedId(null);
      setTimeout(() => props.reload(), 800);
    } catch (e) {
      alert(e instanceof Error ? e.message : "振り分けの保存に失敗しました");
    } finally {
      setPendingId(null);
    }
  }

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

        <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
          <Pill active={groupTab === 1} onClick={() => { setGroupTab(1); setSelectedId(null); }}>
            一群（ストック）
          </Pill>
          <Pill active={groupTab === 2} onClick={() => { setGroupTab(2); setSelectedId(null); }}>
            二群
          </Pill>
        </div>

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
              pending={m.id === pendingId}
              onClick={() => setSelectedId(m.id)}
              onMoveGroup={(g) => moveGroup(m.id, g)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-faint)", fontFamily: "var(--font-body)" }}>
              この条件の間違いはありません。
            </div>
          )}
        </Card>
      </div>

      {selected && (
        <MistakeDetail
          key={selected.id}
          item={selected}
          pending={selected.id === pendingId}
          onClose={() => setSelectedId(null)}
          onMoveGroup={(g) => moveGroup(selected.id, g)}
        />
      )}
    </div>
  );
}

function ConcealedPhoto({ src, alt }: { src: string; alt: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div
      style={{
        position: "relative",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--line)",
        marginBottom: 12,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "auto",
          maxHeight: 240,
          objectFit: "cover",
          display: "block",
          filter: revealed ? "none" : "blur(18px)",
          transform: revealed ? "none" : "scale(1.1)",
          transition: "filter var(--dur-fast) var(--ease-organic)",
        }}
      />
      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            border: "none",
            background: "rgba(44,42,38,0.35)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontFamily: "var(--font-body)",
          }}
        >
          <Icon name="eye" size={22} />
          <span style={{ fontSize: 13 }}>クリックして表示</span>
        </button>
      )}
      {revealed && (
        <button
          type="button"
          onClick={() => setRevealed(false)}
          title="もう一度隠す"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            border: "none",
            borderRadius: "var(--radius-pill)",
            background: "rgba(44,42,38,0.55)",
            color: "#fff",
            cursor: "pointer",
            padding: "4px 8px",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontFamily: "var(--font-body)",
          }}
        >
          <Icon name="eye-off" size={12} /> 隠す
        </button>
      )}
    </div>
  );
}

function MistakeRow({
  item,
  active,
  pending,
  onClick,
  onMoveGroup,
}: {
  item: MistakeNote;
  active: boolean;
  pending: boolean;
  onClick: () => void;
  onMoveGroup: (group: 1 | 2) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--gold-veil)" : "transparent",
        padding: "12px 12px",
        transition: "background var(--dur-fast) var(--ease-organic)",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: 0,
          fontFamily: "var(--font-body)",
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
            {getDisplayTitle(item)}
          </div>
          <div style={{ color: "var(--ink-faint)", fontSize: 12, marginTop: 2 }}>{item.source}</div>
        </div>
        <span className="tnum" style={{ color: "var(--ink-soft)", fontSize: 13, flex: "0 0 auto" }}>
          ×{item.count}
        </span>
        <span className="tnum" style={{ color: "var(--ink-faint)", fontSize: 12, flex: "0 0 auto", width: 44, textAlign: "right" }}>
          {item.date}
        </span>
      </button>
      <Button
        variant="ghost"
        size="sm"
        title={item.group === 1 ? "二群へ移動（直しずみにする）" : "一群に戻す"}
        onClick={() => onMoveGroup(item.group === 1 ? 2 : 1)}
      >
        {pending ? "…" : <Icon name={item.group === 1 ? "arrow-down-circle" : "rotate-ccw"} size={16} />}
      </Button>
    </div>
  );
}

function MistakeDetail({
  item,
  pending,
  onClose,
  onMoveGroup,
}: {
  item: MistakeNote;
  pending: boolean;
  onClose: () => void;
  onMoveGroup: (group: 1 | 2) => void;
}) {
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

      <h3 style={{ fontSize: "1.2rem", lineHeight: 1.35, marginBottom: 10 }}>{getDisplayTitle(item)}</h3>
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

      <div style={{ marginBottom: 18 }}>
        {item.questionPhoto ? (
          <img
            src={item.questionPhoto}
            alt="問題の写真"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 240,
              objectFit: "cover",
              display: "block",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--line)",
              marginBottom: 12,
            }}
          />
        ) : (
          <div
            style={{
              border: "1px dashed var(--line-strong)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-sunken)",
              height: 132,
              display: "grid",
              placeItems: "center",
              color: "var(--ink-faint)",
              marginBottom: 12,
            }}
          >
            <div style={{ textAlign: "center", fontFamily: "var(--font-body)", fontSize: 13 }}>
              <Icon name="image" size={22} />
              <div style={{ marginTop: 6 }}>問題の写真</div>
            </div>
          </div>
        )}

        {item.answerPhoto ? (
          <ConcealedPhoto src={item.answerPhoto} alt="答案・解答用紙" />
        ) : (
          <div
            style={{
              border: "1px dashed var(--line-strong)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-sunken)",
              height: 132,
              display: "grid",
              placeItems: "center",
              color: "var(--ink-faint)",
            }}
          >
            <div style={{ textAlign: "center", fontFamily: "var(--font-body)", fontSize: 13 }}>
              <Icon name="file-text" size={22} />
              <div style={{ marginTop: 6 }}>答案・解答用紙</div>
            </div>
          </div>
        )}
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
        <Button
          variant="outline"
          size="sm"
          iconLeft={<Icon name={item.group === 1 ? "arrow-down-circle" : "rotate-ccw"} size={14} />}
          onClick={() => onMoveGroup(item.group === 1 ? 2 : 1)}
        >
          {pending ? "処理中…" : item.group === 1 ? "二群に移動する" : "一群に戻す"}
        </Button>
      </div>
    </Card>
  );
}
