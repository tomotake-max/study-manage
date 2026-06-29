import { useState } from "react";
import type { DashboardData, MistakeCategory, SubjectName } from "shared";
import { SectionTitle } from "../chrome/SectionTitle";
import { Button } from "../ui/Button";
import { Pill } from "../ui/Pill";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

const CATEGORIES: MistakeCategory[] = ["テキスト", "復習テスト", "公開テスト"];
const SUBJECTS: SubjectName[] = ["算数", "国語", "理科", "社会"];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface)",
  color: "var(--ink)",
  padding: "9px 12px",
  fontFamily: "var(--font-body)",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontFamily: "var(--font-body)",
  fontSize: 13,
  color: "var(--ink-soft)",
  fontWeight: 600,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function UploadSlot({ icon, label, hint }: { icon: string; label: string; hint: string }) {
  const [filled, setFilled] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFilled((v) => !v)}
      style={{
        border: "1px dashed " + (filled ? "var(--gold)" : "var(--line-strong)"),
        background: filled ? "var(--gold-veil)" : "var(--surface-sunken)",
        borderRadius: "var(--radius-md)",
        height: 150,
        width: "100%",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        color: filled ? "var(--gold-deep)" : "var(--ink-faint)",
        transition: "all var(--dur) var(--ease-organic)",
      }}
    >
      <div style={{ textAlign: "center", fontFamily: "var(--font-body)" }}>
        <Icon name={filled ? "check-circle" : icon} size={26} />
        <div style={{ marginTop: 8, fontSize: 14, color: filled ? "var(--gold-deep)" : "var(--ink-soft)" }}>
          {filled ? "アップロード済み" : label}
        </div>
        {!filled && <div style={{ fontSize: 12, marginTop: 2 }}>{hint}</div>}
      </div>
    </button>
  );
}

export function AddMistake(props: { data: DashboardData; onBack: () => void }) {
  const { reasons } = props.data;
  const [cat, setCat] = useState<MistakeCategory>(CATEGORIES[0]);
  const [subject, setSubject] = useState<SubjectName>(SUBJECTS[0]);
  const [reason, setReason] = useState<string>(reasons[0] ?? "");
  const [unit, setUnit] = useState("");
  const [theme, setTheme] = useState("");
  const [source, setSource] = useState("");
  const [question, setQuestion] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const isText = cat === "テキスト";

  function handleSave() {
    setSaved(true);
    setTimeout(() => props.onBack(), 700);
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <button
        type="button"
        onClick={props.onBack}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "var(--ink-soft)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-body)",
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        <Icon name="arrow-left" size={16} /> 間違い直しに戻る
      </button>

      <SectionTitle eyebrow="New entry · 間違いを記録" title="間違えた問題を追加" />

      <Card style={{ padding: 32 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>どこで間違えた？ · カテゴリ</div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 22 }}>
          {CATEGORIES.map((c) => (
            <Pill key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Pill>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <Field label="科目">
            <select style={fieldStyle} value={subject} onChange={(e) => setSubject(e.target.value as SubjectName)}>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label={isText ? "単元" : "出題範囲"}>
            <input
              style={fieldStyle}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={isText ? "速さ" : "速さ・旅人算"}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
          <Field label={isText ? "細目（テーマ）" : "テスト名"}>
            <input
              style={fieldStyle}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={isText ? "追い越し" : "第18回 復習テスト"}
            />
          </Field>
          <Field label={isText ? "出典 · ページ" : "日付"}>
            <input
              style={fieldStyle}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={isText ? "速さテキスト p.32" : "6/21"}
            />
          </Field>
        </div>

        <div style={{ marginTop: 22 }}>
          <Field label="問題のタイトル">
            <input
              style={fieldStyle}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="兄が弟を追い越すのにかかる時間"
            />
          </Field>
        </div>

        <div style={{ marginTop: 26 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>アップロード · テキスト と テスト</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <UploadSlot icon="book-open" label={isText ? "テキストの該当箇所" : "問題用紙"} hint="クリックして写真を追加" />
            <UploadSlot icon="file-text" label="答案・解答用紙" hint="間違えた答案を追加" />
          </div>
        </div>

        <div style={{ margin: "28px 0", borderTop: "1px solid var(--line)" }} />

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>間違いの理由</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {reasons.map((r) => (
              <Pill key={r} active={reason === r} onClick={() => setReason(r)}>
                {r}
              </Pill>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Field label="わからなかったところ・気づき">
            <textarea
              style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="追い越しは『差÷速さの差』。和で割らないよう注意。"
            />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 28 }}>
          {saved && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--success)",
                fontFamily: "var(--font-body)",
                fontSize: 14,
              }}
            >
              <Icon name="check-circle" size={16} /> 保存しました
            </span>
          )}
          <Button variant="ghost" onClick={props.onBack}>
            キャンセル
          </Button>
          <Button variant="solid" iconLeft={<Icon name="check" size={16} />} onClick={handleSave}>
            間違いを保存
          </Button>
        </div>
      </Card>
    </div>
  );
}
