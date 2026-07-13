# 間違い直し テスト系間違いのタイトル表示改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「復習テスト」「公開テスト」カテゴリの間違いについて、一覧行・詳細パネルの見出しに「テスト名・日付・科目・問題名」を合成した分かりやすいタイトルを表示する。

**Architecture:** `app-dashboard/src/screens/Mistakes.tsx` に表示専用のヘルパー関数`getDisplayTitle`を追加し、`MistakeRow`と`MistakeDetail`の2箇所で`item.question`の代わりに使う。データモデル・パイプラインは変更しない。

**Tech Stack:** 既存のTypeScript/React（app-dashboard）のみ。新規依存なし。

参照元: `docs/superpowers/specs/2026-07-13-mistake-title-display-design.md`

---

## File Structure

```
app-dashboard/src/screens/Mistakes.tsx   getDisplayTitle関数を追加、MistakeRow/MistakeDetailで使用
```

---

## Task 1: getDisplayTitleの追加と適用

**Files:**
- Modify: `app-dashboard/src/screens/Mistakes.tsx`

- [ ] **Step 1: getDisplayTitle関数を追加**

`app-dashboard/src/screens/Mistakes.tsx` の `const SUBJECTS: SubjectName[] = ["算数", "国語", "理科", "社会"];` の直後に追加:

```ts
function getDisplayTitle(item: MistakeNote): string {
  if (item.category === "テキスト") return item.question;
  return [item.theme, item.source, item.subject, item.question].filter(Boolean).join("・");
}
```

- [ ] **Step 2: MistakeRowの一覧行タイトルで使用**

`MistakeRow`関数内の以下の箇所を:

```tsx
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--ink)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.question}
          </div>
          <div style={{ color: "var(--ink-faint)", fontSize: 12, marginTop: 2 }}>{item.source}</div>
        </div>
```

以下に置き換える（`{item.question}` を `{getDisplayTitle(item)}` に変更するのみ）:

```tsx
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--ink)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {getDisplayTitle(item)}
          </div>
          <div style={{ color: "var(--ink-faint)", fontSize: 12, marginTop: 2 }}>{item.source}</div>
        </div>
```

- [ ] **Step 3: MistakeDetailの見出しで使用**

`MistakeDetail`関数内の以下の行を:

```tsx
      <h3 style={{ fontSize: "1.2rem", lineHeight: 1.35, marginBottom: 10 }}>{item.question}</h3>
```

以下に置き換える:

```tsx
      <h3 style={{ fontSize: "1.2rem", lineHeight: 1.35, marginBottom: 10 }}>{getDisplayTitle(item)}</h3>
```

- [ ] **Step 4: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: 手動で動作確認**

Run: `pnpm dev`（`pnpm watch:data`も別ターミナルで起動。既に起動済みなら不要）。「間違い直し」画面で「復習テスト」または「公開テスト」カテゴリの間違いを一覧・詳細の両方で確認する。

Expected: 一覧行のタイトルと詳細パネルの見出しが「テスト名・日付・科目・問題名」の合成文字列（例:「第640回公開テスト・7/12・算数・(6)」）で表示される。「テキスト」カテゴリの間違いは従来通り`question`のみが表示される（変化なし）。

- [ ] **Step 6: コミット**

```bash
git add app-dashboard/src/screens/Mistakes.tsx
git commit -m "feat: compose display title from test name/date/subject/question for test-category mistakes"
```

---

## Self-Review メモ

- **スペックの全項目をカバー**: §3の表示ロジック（関数定義、2箇所での適用、テキストカテゴリは変更なし）を1タスクで実装。
- **型整合**: `getDisplayTitle`の引数・戻り値の型、呼び出し箇所（`MistakeRow`/`MistakeDetail`いずれも`item: MistakeNote`を受け取る）は既存の型と一致。
- **プレースホルダーなし**: 全ステップに実コードを記載。
