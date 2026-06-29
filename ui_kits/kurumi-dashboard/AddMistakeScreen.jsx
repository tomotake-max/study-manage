/* Atelier Mucha kit — Add mistake form (科目選択 / アップロード / 理由 / メモ) */
(function () {
const { Card, Input, Select, Textarea, Button, Badge, HaloDivider } =
  window.AtelierMuchaDesignSystem_29c0c4;

function UploadSlot({ icon, label, hint }) {
  const [filled, setFilled] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => setFilled((v) => !v)}
      style={{
        border: "1px dashed " + (filled ? "var(--gold)" : "var(--line-strong)"),
        background: filled ? "var(--gold-veil)" : "var(--surface-sunken)",
        borderRadius: "var(--radius-md)",
        height: 150, width: "100%", cursor: "pointer",
        display: "grid", placeItems: "center", color: filled ? "var(--gold-deep)" : "var(--ink-faint)",
        transition: "all var(--dur) var(--ease-organic)",
      }}
    >
      <div style={{ textAlign: "center", fontFamily: "var(--font-body)" }}>
        <Icon name={filled ? "check-circle" : icon} size={26} />
        <div style={{ marginTop: 8, fontSize: 14, color: filled ? "var(--gold-deep)" : "var(--ink-soft)" }}>{filled ? "アップロード済み" : label}</div>
        {!filled && <div style={{ fontSize: 12, marginTop: 2 }}>{hint}</div>}
      </div>
    </button>
  );
}

function AddMistakeScreen({ go }) {
  const m = window.MOCK;
  const [reason, setReason] = React.useState(m.reasons[0]);
  const [cat, setCat] = React.useState(m.categories[0]);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <button onClick={() => go("mistakes")} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontSize: 14, marginBottom: 16 }}>
        <Icon name="arrow-left" size={16} /> 間違い直しに戻る
      </button>

      <SectionTitle eyebrow="New entry · 間違いを記録" title="間違えた問題を追加" />

      <Card accent style={{ padding: 32 }}>
        {/* カテゴリ：テキスト / 復習テスト / 公開テスト */}
        <div className="eyebrow" style={{ marginBottom: 10 }}>どこで間違えた？ · カテゴリ</div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 22 }}>
          {m.categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{
              border: "1px solid " + (cat === c ? "var(--gold)" : "var(--line)"),
              background: cat === c ? "var(--gold-veil)" : "var(--surface)",
              color: cat === c ? "var(--gold-deep)" : "var(--ink-soft)",
              borderRadius: "var(--radius-pill)", padding: "7px 16px", cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: 14,
              transition: "all var(--dur-fast) var(--ease-organic)",
            }}>{c}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <Select label="科目" options={m.subjects.map((s) => s.name)} />
          <Input label={cat === "テキスト" ? "単元" : "出題範囲"} placeholder={cat === "テキスト" ? "速さ" : "速さ・旅人算"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
          <Input label={cat === "テキスト" ? "細目（テーマ）" : "テスト名"} placeholder={cat === "テキスト" ? "追い越し" : "第18回 復習テスト"} />
          <Input label={cat === "テキスト" ? "出典 · ページ" : "日付"} placeholder={cat === "テキスト" ? "速さテキスト p.32" : "6/21"} />
        </div>

        <div style={{ marginTop: 22 }}>
          <Input label="問題のタイトル" placeholder="兄が弟を追い越すのにかかる時間" />
        </div>

        {/* uploads */}
        <div style={{ marginTop: 26 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>アップロード · テキスト と テスト</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <UploadSlot icon="book-open" label={cat === "テキスト" ? "テキストの該当箇所" : "問題用紙"} hint="クリックして写真を追加" />
            <UploadSlot icon="file-text" label="答案・解答用紙" hint="間違えた答案を追加" />
          </div>
        </div>

        <div style={{ margin: "28px 0" }}><HaloDivider label="なぜ間違えたか" /></div>

        {/* reason taxonomy */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>間違いの理由</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {m.reasons.map((r) => (
              <button key={r} onClick={() => setReason(r)} style={{
                border: "1px solid " + (reason === r ? "var(--gold)" : "var(--line)"),
                background: reason === r ? "var(--gold-veil)" : "var(--surface)",
                color: reason === r ? "var(--gold-deep)" : "var(--ink-soft)",
                borderRadius: "var(--radius-pill)", padding: "7px 16px", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: 14,
                transition: "all var(--dur-fast) var(--ease-organic)",
              }}>{r}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Textarea label="わからなかったところ・気づき" rows={4} placeholder="追い越しは『差÷速さの差』。和で割らないよう注意。" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 }}>
          <Button variant="ghost" onClick={() => go("mistakes")}>キャンセル</Button>
          <Button variant="primary" onClick={() => go("mistakes")}><Icon name="check" size={16} />&nbsp;間違いを保存</Button>
        </div>
      </Card>
    </div>
  );
}

window.AddMistakeScreen = AddMistakeScreen;
})();
