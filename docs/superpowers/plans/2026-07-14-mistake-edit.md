# 間違い直し 編集機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保存済みの間違いを、間違い追加フォームを再利用した編集モードで修正できるようにする（写真の差し替え含む）。

**Architecture:** `pipeline/src/write.ts`に`updateMistake`を追加し既存ノートを上書き保存（group/count/dateは維持）。Viteミドルウェアに更新用エンドポイントを追加。`AddMistake.tsx`が`editItem`propを受け取り編集モードで動作し、`App.tsx`が編集対象のstateとルーティングを管理する。

**Tech Stack:** 既存のTypeScript/Vite/vitest/React。新規依存なし。

参照元: `docs/superpowers/specs/2026-07-14-mistake-edit-design.md`

---

## File Structure

```
pipeline/src/write.ts                    applyCategoryFieldsヘルパー抽出、updateMistake追加
pipeline/test/write.test.ts              updateMistakeのテスト追加
app-dashboard/vite-plugins/vault-api.ts  POST /api/mistakes/:id ルート追加
app-dashboard/src/api.ts                 updateMistakeApi・UpdateMistakePayload追加
app-dashboard/src/screens/AddMistake.tsx editItem対応（事前入力・写真プレビュー・保存分岐）
app-dashboard/src/screens/Mistakes.tsx   onEdit prop・「編集する」ボタン追加
app-dashboard/src/App.tsx                editingMistake state・ルーティング配線
```

---

## Task 1: pipeline — applyCategoryFieldsヘルパーの抽出（リファクタ）

**Files:**
- Modify: `pipeline/src/write.ts`

- [ ] **Step 1: applyCategoryFields関数を追加し、createMistakeから呼び出す**

`pipeline/src/write.ts` の `decodeDataUrl` 関数の直後に追加:

```ts
function applyCategoryFields(
  frontmatter: Record<string, unknown>,
  fields: { category: MistakeCategory; textTitle?: string; page?: string; source?: string },
): void {
  if (fields.category === "テキスト") {
    frontmatter.text_title = fields.textTitle ?? "";
    frontmatter.page = fields.page ?? "";
  } else {
    frontmatter.source = fields.source ?? "";
  }
}
```

`createMistake`関数内の以下のブロックを:

```ts
  if (fields.category === "テキスト") {
    frontmatter.text_title = fields.textTitle ?? "";
    frontmatter.page = fields.page ?? "";
  } else {
    frontmatter.source = fields.source ?? "";
  }
```

以下に置き換える:

```ts
  applyCategoryFields(frontmatter, fields);
```

- [ ] **Step 2: 既存テストがすべて通ることを確認（リファクタなので新規テスト不要）**

Run: `pnpm --filter pipeline test`
Expected: PASS（全24テスト、既存の`createMistake`のテストが引き続き通ることでリファクタが正しいことを確認する）

- [ ] **Step 3: コミット**

```bash
git add pipeline/src/write.ts
git commit -m "refactor: extract applyCategoryFields helper from createMistake"
```

---

## Task 2: pipeline — updateMistakeの追加（TDD）

**Files:**
- Modify: `pipeline/src/write.ts`, `pipeline/test/write.test.ts`

- [ ] **Step 1: 失敗するテストを追加**

`pipeline/test/write.test.ts` の末尾（`describe("createMistake", ...)` ブロックの最後の `});` の直後）に以下を追加:

```ts

describe("updateMistake", () => {
  it("既存ノートの内容を更新し、group/count/dateは維持する", async () => {
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "旅人算", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "旅人算の応用", note: "元のメモ",
      count: 3, date: "7/2",
    });
    await setMistakeGroup(vaultDir, id, 2);

    await updateMistake(vaultDir, id, {
      subject: "算数", unit: "速さ", theme: "旅人算(改)", category: "テキスト",
      textTitle: "プラスワン問題集", page: "50",
      reason: "うっかりミス", question: "旅人算の応用(修正)", note: "直したメモ",
    });

    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.theme).toBe("旅人算(改)");
    expect(parsed.data.page).toBe("50");
    expect(parsed.data.reason).toBe("うっかりミス");
    expect(parsed.data.question).toBe("旅人算の応用(修正)");
    expect(parsed.content.trim()).toBe("直したメモ");
    expect(parsed.data.group).toBe(2);
    expect(parsed.data.count).toBe(3);
    expect(parsed.data.date).toBe("7/2");
  });

  it("カテゴリを切り替えると古いカテゴリ専用フィールドは残らない", async () => {
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "旅人算", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "旅人算の応用", note: "",
      count: 1, date: "7/2",
    });

    await updateMistake(vaultDir, id, {
      subject: "算数", unit: "速さ・旅人算", theme: "第10回復習テスト", category: "復習テスト",
      source: "7/10",
      reason: "計算ミス", question: "大問3", note: "",
    });

    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.source).toBe("7/10");
    expect(parsed.data.text_title).toBeUndefined();
    expect(parsed.data.page).toBeUndefined();
  });

  it("写真を渡さなければ既存の写真フィールドを維持する", async () => {
    const TINY_PNG =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "旅人算写真", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "写真つき", note: "",
      count: 1, date: "7/3",
      questionPhotoDataUrl: TINY_PNG,
    });

    await updateMistake(vaultDir, id, {
      subject: "算数", unit: "速さ", theme: "旅人算写真(改)", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "写真つき(修正)", note: "",
    });

    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.question_photo).toBe(`${id}-question.png`);

    const buf = await readFile(path.join(vaultDir, "間違い", "attachments", `${id}-question.png`));
    expect(buf.length).toBeGreaterThan(0);
  });

  it("新しい写真を渡すと古い添付ファイルを削除して差し替える", async () => {
    const TINY_PNG =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const TINY_JPEG =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "旅人算写真差し替え", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "写真つき", note: "",
      count: 1, date: "7/3",
      questionPhotoDataUrl: TINY_PNG,
    });
    const oldPath = path.join(vaultDir, "間違い", "attachments", `${id}-question.png`);
    const oldBuf = await readFile(oldPath);
    expect(oldBuf.length).toBeGreaterThan(0);

    await updateMistake(vaultDir, id, {
      subject: "算数", unit: "速さ", theme: "旅人算写真差し替え", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "写真つき", note: "",
      questionPhotoDataUrl: TINY_JPEG,
    });

    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.question_photo).toBe(`${id}-question.jpg`);

    const newBuf = await readFile(path.join(vaultDir, "間違い", "attachments", `${id}-question.jpg`));
    expect(newBuf.length).toBeGreaterThan(0);

    await expect(readFile(oldPath)).rejects.toThrow();
  });

  it("存在しないidを渡すとエラーを投げる", async () => {
    await expect(
      updateMistake(vaultDir, "does-not-exist", {
        subject: "算数", unit: "速さ", theme: "テーマ", category: "テキスト",
        reason: "計算ミス", question: "問題", note: "",
      }),
    ).rejects.toThrow();
  });

  it("idにパストラバーサルを含む場合は例外を投げる", async () => {
    await expect(
      updateMistake(vaultDir, "../evil", {
        subject: "算数", unit: "速さ", theme: "テーマ", category: "テキスト",
        reason: "計算ミス", question: "問題", note: "",
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: importにupdateMistakeを追加**

`pipeline/test/write.test.ts` の先頭の import 文を書き換え:

```diff
-import { setMistakeGroup, createMaterialStub, createMistake } from "../src/write.js";
+import { setMistakeGroup, createMaterialStub, createMistake, updateMistake } from "../src/write.js";
```

- [ ] **Step 3: テスト実行して失敗を確認**

Run: `pnpm --filter pipeline test write`
Expected: FAIL（`updateMistake`が存在しない）

- [ ] **Step 4: write.ts に updateMistake を実装**

`pipeline/src/write.ts` の先頭 import を書き換え:

```diff
-import { readFile, writeFile, mkdir, access } from "node:fs/promises";
+import { readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
```

`savePhoto`関数の直後に、写真削除用のヘルパーを追加:

```ts
async function deletePhotoIfExists(vaultDir: string, filename: string): Promise<void> {
  const filePath = path.join(vaultDir, "間違い", "attachments", filename);
  try {
    await rm(filePath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}
```

ファイルの末尾（`createMistake`関数の後）に追加:

```ts
export interface UpdateMistakeInput {
  subject: SubjectName;
  unit: string;
  theme: string;
  category: MistakeCategory;
  textTitle?: string;
  page?: string;
  source?: string;
  reason: string;
  question: string;
  note: string;
  questionPhotoDataUrl?: string;
  answerPhotoDataUrl?: string;
}

export async function updateMistake(
  vaultDir: string,
  id: string,
  fields: UpdateMistakeInput,
): Promise<void> {
  if (id.includes("/") || id.includes("\\")) {
    throw new Error("invalid id");
  }
  const dir = path.join(vaultDir, "間違い");
  const file = path.join(dir, `${id}.md`);
  if (path.dirname(file) !== dir) {
    throw new Error("invalid id");
  }

  const raw = await readFile(file, "utf8");
  const existing = matter(raw);

  const frontmatter: Record<string, unknown> = {
    subject: fields.subject,
    unit: fields.unit,
    theme: fields.theme,
    category: fields.category,
    reason: fields.reason,
    question: fields.question,
    count: existing.data.count,
    date: existing.data.date,
    group: existing.data.group,
  };
  applyCategoryFields(frontmatter, fields);

  if (fields.questionPhotoDataUrl) {
    if (existing.data.question_photo) {
      await deletePhotoIfExists(vaultDir, existing.data.question_photo as string);
    }
    frontmatter.question_photo = await savePhoto(vaultDir, id, "question", fields.questionPhotoDataUrl);
  } else if (existing.data.question_photo) {
    frontmatter.question_photo = existing.data.question_photo;
  }

  if (fields.answerPhotoDataUrl) {
    if (existing.data.answer_photo) {
      await deletePhotoIfExists(vaultDir, existing.data.answer_photo as string);
    }
    frontmatter.answer_photo = await savePhoto(vaultDir, id, "answer", fields.answerPhotoDataUrl);
  } else if (existing.data.answer_photo) {
    frontmatter.answer_photo = existing.data.answer_photo;
  }

  await writeFile(file, matter.stringify(fields.note ?? "", frontmatter), "utf8");
}
```

- [ ] **Step 5: テスト実行して成功を確認**

Run: `pnpm --filter pipeline test`
Expected: PASS（既存24テスト＋新規6テスト＝30テスト）

- [ ] **Step 6: コミット**

```bash
git add pipeline/src/write.ts pipeline/test/write.test.ts
git commit -m "feat: add updateMistake to edit existing mistake notes"
```

---

## Task 3: ローカル書込API — 更新用エンドポイント追加

**Files:**
- Modify: `app-dashboard/vite-plugins/vault-api.ts`

- [ ] **Step 1: import に updateMistake を追加**

```diff
-import { setMistakeGroup, createMaterialStub, createMistake } from "../../pipeline/src/write";
+import { setMistakeGroup, createMaterialStub, createMistake, updateMistake } from "../../pipeline/src/write";
```

- [ ] **Step 2: POST /api/mistakes/:id ルートを追加**

`req.url === "/api/mistakes"` の分岐ブロックの直後（`next();` の前）に追加:

```ts
          const updateMatch = req.url.match(/^\/api\/mistakes\/([^/]+)$/);
          if (updateMatch) {
            const body = await readJsonBody(req);
            await updateMistake(VAULT, decodeURIComponent(updateMatch[1]), body as any);
            res.end(JSON.stringify({ ok: true }));
            return;
          }
```

（この正規表現は`/api/mistakes/:id/group`にはマッチしない — `[^/]+`はスラッシュを含む文字列にマッチせず、`/group`の分だけ余分な文字列が残るため。念のため、この新しいルートは既存の`/group`ルートより後ろに置く。）

- [ ] **Step 3: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add app-dashboard/vite-plugins/vault-api.ts
git commit -m "feat: add PUT-like update endpoint for mistakes to vault-api"
```

---

## Task 4: app-dashboard — api.tsにupdateMistakeApiを追加

**Files:**
- Modify: `app-dashboard/src/api.ts`

- [ ] **Step 1: UpdateMistakePayload型とupdateMistakeApiを追加**

`app-dashboard/src/api.ts` の末尾に追加:

```ts
export interface UpdateMistakePayload {
  subject: SubjectName;
  unit: string;
  theme: string;
  category: MistakeCategory;
  textTitle?: string;
  page?: string;
  source?: string;
  reason: string;
  question: string;
  note: string;
  questionPhotoDataUrl?: string;
  answerPhotoDataUrl?: string;
}

export async function updateMistakeApi(id: string, payload: UpdateMistakePayload): Promise<void> {
  const res = await fetch(`/api/mistakes/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "間違いの更新に失敗しました");
  }
}
```

- [ ] **Step 2: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: `api.ts`自体はエラーなし

- [ ] **Step 3: コミット**

```bash
git add app-dashboard/src/api.ts
git commit -m "feat: add updateMistakeApi client helper"
```

---

## Task 5: AddMistake画面 — editItem対応

**Files:**
- Modify: `app-dashboard/src/screens/AddMistake.tsx`

- [ ] **Step 1: importにMistakeNoteとupdateMistakeApiを追加**

```diff
-import type { DashboardData, MistakeCategory, SubjectName } from "shared";
+import type { DashboardData, MistakeCategory, MistakeNote, SubjectName } from "shared";
 import { normalizeDigits } from "shared";
-import { createMaterialApi, createMistakeApi } from "../api";
+import { createMaterialApi, createMistakeApi, updateMistakeApi } from "../api";
```

- [ ] **Step 2: UploadSlotに初期プレビュー表示機能を追加**

`UploadSlotProps` interface を以下に置き換え:

```ts
interface UploadSlotProps {
  icon: string;
  label: string;
  hint: string;
  onFileSelected: (file: File, preview: string) => void;
  /** 答案・解答など、先に見えると直しの意味がなくなる写真用。
   *  選択後は伏せ字（ぼかし）表示にし、クリックでその場限り表示する。 */
  concealAfterSelect?: boolean;
  /** 編集モードで、既に保存されている写真のURLをプレビューとして表示する場合に指定する。 */
  initialPreviewUrl?: string;
}
```

`UploadSlot`関数の冒頭を以下に置き換え:

```diff
-function UploadSlot({ icon, label, hint, onFileSelected, concealAfterSelect }: UploadSlotProps) {
-  const [preview, setPreview] = useState<string | null>(null);
+function UploadSlot({ icon, label, hint, onFileSelected, concealAfterSelect, initialPreviewUrl }: UploadSlotProps) {
+  const [preview, setPreview] = useState<string | null>(initialPreviewUrl ?? null);
```

- [ ] **Step 3: コンポーネントのpropsとstate初期値をeditItem対応にする**

`AddMistake`関数のシグネチャとstate初期化部分を以下に置き換え:

```tsx
export function AddMistake(props: {
  data: DashboardData;
  onBack: () => void;
  reload: () => void;
  editItem?: MistakeNote | null;
}) {
  const { reasons } = props.data;
  const editItem = props.editItem ?? null;
  const [cat, setCat] = useState<MistakeCategory>(editItem?.category ?? CATEGORIES[0]);
  const [subject, setSubject] = useState<SubjectName>(editItem?.subject ?? SUBJECTS[0]);
  const [reason, setReason] = useState<string>(editItem?.reason ?? reasons[0] ?? "");
  const [unit, setUnit] = useState(editItem?.unit ?? "");
  const [theme, setTheme] = useState(editItem?.theme ?? "");
  const [source, setSource] = useState(editItem && editItem.category !== "テキスト" ? editItem.source : "");
  const [textTitle, setTextTitle] = useState(editItem?.textTitle ?? "");
  const [newTextTitle, setNewTextTitle] = useState("");
  const [page, setPageRaw] = useState(editItem?.page ?? "");
  const setPage = (v: string) => setPageRaw(normalizeDigits(v));
  const [showDictionary, setShowDictionary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState(editItem?.question ?? "");
  const [note, setNote] = useState(editItem?.note ?? "");
  const [saved, setSaved] = useState(false);
  const [photo1, setPhoto1] = useState<File | null>(null);
  const [photo1Preview, setPhoto1Preview] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<File | null>(null);
  const [photo2Preview, setPhoto2Preview] = useState<string | null>(null);

  const isText = cat === "テキスト";
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setTextTitle("");
    setNewTextTitle("");
  }, [subject]);
```

**重要**: `photo1Preview`/`photo2Preview`（写真の新規選択を表すstate）は編集モードでも`null`のまま初期化する。これは意図的な設計で、「新しい写真を選ばなければ既存の写真を維持する」という仕様を、送信データが空＝変更なし、として自然に表現するため（保存処理側で`photo1Preview ?? undefined`として送信するので、選択しなければ`undefined`が送られ、サーバー側の`updateMistake`が既存の写真を維持する）。既存の写真の見た目のプレビュー表示は、Step 2で追加した`UploadSlot`の`initialPreviewUrl`が別途担当する。

**注意（`useEffect`のガードについて）**: 既存コードは`subject`が変わるたびに`textTitle`/`newTextTitle`をリセットする`useEffect`を持っていた。この`useEffect`はマウント時にも1回実行されるため、何もガードせずに`editItem`から`textTitle`を事前入力すると、マウント直後にこの`useEffect`によって即座に空文字へリセットされてしまう。`isFirstRender`refで初回実行をスキップすることで、事前入力された値が消えないようにする。

- [ ] **Step 4: 型チェックのためuseRefをimportに追加**

`app-dashboard/src/screens/AddMistake.tsx` の先頭行を確認する。既に`import { useState, useRef, useEffect } from "react";`となっており`useRef`は既にimport済みのため、この行の変更は不要（確認のみ）。

- [ ] **Step 5: handleSaveを編集/新規で分岐させる**

`handleSave`関数を以下に置き換え:

```ts
  async function handleSave() {
    if (saving) return;
    const finalTextTitle = textTitle === NEW_TEXT_VALUE ? newTextTitle.trim() : textTitle;
    if (isText && !finalTextTitle) {
      alert("テキスト名を選択または入力してください");
      return;
    }
    setSaving(true);
    try {
      if (isText && textTitle === NEW_TEXT_VALUE && finalTextTitle) {
        await createMaterialApi(subject, finalTextTitle);
      }
      const questionPhotoDataUrl = photo1Preview ?? undefined;
      const answerPhotoDataUrl = photo2Preview ?? undefined;
      if (editItem) {
        await updateMistakeApi(editItem.id, {
          subject, unit, theme, category: cat,
          ...(isText ? { textTitle: finalTextTitle, page } : { source }),
          reason, question, note,
          questionPhotoDataUrl, answerPhotoDataUrl,
        });
      } else {
        const today = new Date();
        const date = `${today.getMonth() + 1}/${today.getDate()}`;
        await createMistakeApi({
          subject, unit, theme, category: cat,
          ...(isText ? { textTitle: finalTextTitle, page } : { source }),
          reason, question, note, count: 1, date,
          questionPhotoDataUrl, answerPhotoDataUrl,
        });
      }
      setSaved(true);
      setTimeout(() => props.reload(), 800);
      setTimeout(() => props.onBack(), 700);
    } catch (e) {
      alert(e instanceof Error ? e.message : editItem ? "間違いの更新に失敗しました" : "間違いの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }
```

- [ ] **Step 6: 見出しと保存ボタンのラベルを編集モード対応にする**

```diff
-      <SectionTitle eyebrow="New entry · 間違いを記録" title="間違えた問題を追加" />
+      <SectionTitle
+        eyebrow={editItem ? "Edit entry · 間違いを編集" : "New entry · 間違いを記録"}
+        title={editItem ? "間違えた問題を編集" : "間違えた問題を追加"}
+      />
```

```diff
           <Button variant="solid" iconLeft={<Icon name="check" size={16} />} onClick={handleSave}>
-            {saving ? "保存中…" : "間違いを保存"}
+            {saving ? (editItem ? "更新中…" : "保存中…") : editItem ? "更新する" : "間違いを保存"}
           </Button>
```

- [ ] **Step 7: 写真アップロード枠に既存写真を渡す**

```diff
             <div>
               <div style={labelStyle}>{isText ? "テキストの該当箇所" : "問題用紙"}</div>
-              <UploadSlot icon="book-open" label={isText ? "テキストの該当箇所" : "問題用紙"} hint="クリックして写真を追加" onFileSelected={handlePhoto1Selected} />
+              <UploadSlot
+                icon="book-open"
+                label={isText ? "テキストの該当箇所" : "問題用紙"}
+                hint="クリックして写真を追加"
+                onFileSelected={handlePhoto1Selected}
+                initialPreviewUrl={editItem?.questionPhoto}
+              />
             </div>
             <div>
               <div style={labelStyle}>答案・解答用紙</div>
               <UploadSlot
                 icon="file-text"
                 label="答案・解答用紙"
                 hint="間違えた答案を追加"
                 onFileSelected={handlePhoto2Selected}
                 concealAfterSelect
+                initialPreviewUrl={editItem?.answerPhoto}
               />
             </div>
```

- [ ] **Step 8: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: `AddMistake.tsx`関連のエラーなし（`props.editItem`を渡していない`App.tsx`側は次のTask 7で対応するまで一時的にエラーが出る可能性があるが想定内）

- [ ] **Step 9: コミット**

```bash
git add app-dashboard/src/screens/AddMistake.tsx
git commit -m "feat: support edit mode in AddMistake with photo replace"
```

---

## Task 6: Mistakes画面 — 編集ボタン追加

**Files:**
- Modify: `app-dashboard/src/screens/Mistakes.tsx`

- [ ] **Step 1: Mistakes関数にonEdit propを追加**

```diff
 export function Mistakes(props: {
   data: DashboardData;
   onAdd: () => void;
+  onEdit: (item: MistakeNote) => void;
   onDataChange: (updater: (d: DashboardData) => DashboardData) => void;
   reload: () => void;
 }) {
```

- [ ] **Step 2: MistakeDetailにonEditを渡す**

```diff
       {selected && (
         <MistakeDetail
           key={selected.id}
           item={selected}
           pending={selected.id === pendingId}
           onClose={() => setSelectedId(null)}
           onMoveGroup={(g) => moveGroup(selected.id, g)}
+          onEdit={props.onEdit}
         />
       )}
```

- [ ] **Step 3: MistakeDetailのpropsとフッターに編集ボタンを追加**

```diff
 function MistakeDetail({
   item,
   pending,
   onClose,
   onMoveGroup,
+  onEdit,
 }: {
   item: MistakeNote;
   pending: boolean;
   onClose: () => void;
   onMoveGroup: (group: 1 | 2) => void;
+  onEdit: (item: MistakeNote) => void;
 }) {
```

`MistakeDetail`関数内の以下のブロックを:

```tsx
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
```

以下に置き換える:

```tsx
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
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" iconLeft={<Icon name="pencil" size={14} />} onClick={() => onEdit(item)}>
            編集する
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconLeft={<Icon name={item.group === 1 ? "arrow-down-circle" : "rotate-ccw"} size={14} />}
            onClick={() => onMoveGroup(item.group === 1 ? 2 : 1)}
          >
            {pending ? "処理中…" : item.group === 1 ? "二群に移動する" : "一群に戻す"}
          </Button>
        </div>
      </div>
```

- [ ] **Step 4: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: `Mistakes.tsx`関連のエラーなし（`App.tsx`が`onEdit`を渡していないため一時的にエラーが出る可能性があるが、Task 7で対応するまで想定内）

- [ ] **Step 5: コミット**

```bash
git add app-dashboard/src/screens/Mistakes.tsx
git commit -m "feat: add edit button to mistake detail panel"
```

---

## Task 7: App.tsx — 編集ルーティングの配線

**Files:**
- Modify: `app-dashboard/src/App.tsx`

- [ ] **Step 1: importにMistakeNoteを追加**

```diff
-import type { DashboardData, SubjectName } from "shared";
+import type { DashboardData, MistakeNote, SubjectName } from "shared";
```

- [ ] **Step 2: editingMistake stateとナビゲーション関数を追加**

```diff
 export function App() {
   const [data, setData] = useState<DashboardData | null>(null);
   const [page, setPage] = useState<Page>("home");
   const [matSubject, setMatSubject] = useState<string>("all");
+  const [editingMistake, setEditingMistake] = useState<MistakeNote | null>(null);
 
   useEffect(() => {
     loadData().then(setData);
   }, []);
 
   if (!data) return <div style={{ padding: 40 }}>読み込み中…</div>;
 
   const reload = () => { loadData().then(setData); };
 
   const updateData = (updater: (d: DashboardData) => DashboardData) => {
     setData((prev) => (prev ? updater(prev) : prev));
   };
 
   const go = (p: string, opts?: { subject?: string }) => {
     if (opts && opts.subject) setMatSubject(opts.subject);
     setPage(p as Page);
   };
+
+  const goToAdd = () => {
+    setEditingMistake(null);
+    setPage("add");
+  };
+
+  const goToEdit = (item: MistakeNote) => {
+    setEditingMistake(item);
+    setPage("add");
+  };
+
+  const goBackFromAdd = () => {
+    setEditingMistake(null);
+    go("mistakes");
+  };
```

- [ ] **Step 3: 画面分岐でnewMistake/editingMistakeを配線する**

```diff
   let screen;
   if (page === "home") screen = <Dashboard data={data} />;
-  else if (page === "mistakes") screen = <Mistakes data={data} onAdd={() => go("add")} onDataChange={updateData} reload={reload} />;
-  else if (page === "add") screen = <AddMistake data={data} onBack={() => go("mistakes")} reload={reload} />;
+  else if (page === "mistakes") screen = <Mistakes data={data} onAdd={goToAdd} onEdit={goToEdit} onDataChange={updateData} reload={reload} />;
+  else if (page === "add") screen = <AddMistake key={editingMistake?.id ?? "new"} data={data} editItem={editingMistake} onBack={goBackFromAdd} reload={reload} />;
   else if (page === "materials") screen = <Materials data={data} subject={matSubject} />;
   else screen = <Calendar data={data} />;
```

- [ ] **Step 4: TopBarの「記録する」ボタンもgoToAddを使うようにする**

```diff
-                <Button variant="solid" size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={() => go("add")}>
+                <Button variant="solid" size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={goToAdd}>
                   記録する
                 </Button>
```

- [ ] **Step 5: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: エラーなし（Task 5・Task 6で保留していたエラーもここで解消される）

- [ ] **Step 6: 手動で動作確認**

Run: `pnpm dev`（`pnpm watch:data`も別ターミナルで起動、既に起動済みなら不要）。

1. 「間違い直し」で任意の間違いを開き「編集する」をクリック → フォームに既存の値（科目・カテゴリ・単元・テーマ・テキスト名またはテスト名/日付・問題・理由・メモ）が入った状態で開くことを確認
2. 写真がある間違いなら、既存の写真がプレビュー表示されることを確認
3. 何か項目を変更して「更新する」をクリック → 「間違い直し」に戻り、変更内容が一覧・詳細に反映されていることを確認
4. `vault/間違い/`の該当ノートのfrontmatterが更新されていること、`group`・`count`・`date`は変わっていないことを確認
5. 「間違いを追加」（新規作成）ボタンからフォームを開いたときに、直前の編集内容が残っていない（まっさらな新規フォームになっている）ことを確認

Expected: 上記すべてが問題なく動作する。

- [ ] **Step 7: コミット**

```bash
git add app-dashboard/src/App.tsx
git commit -m "feat: wire mistake edit routing in App.tsx"
```

---

## Task 8: 最終確認

- [ ] **Step 1: 全パッケージのテストを実行**

Run: `pnpm --filter shared test && pnpm --filter pipeline test`
Expected: 全テストPASS

- [ ] **Step 2: 型チェック**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: 通しの手動確認**

Run: `pnpm build:data && pnpm dev`（別ターミナルで`pnpm watch:data`も起動）

1. 新規に間違いを1件、写真つきで作成する
2. 作成した間違いを「編集する」で開き、テキスト名・単元・理由・メモを変更し、答案の写真だけ新しいものに差し替えて保存する
3. `vault/間違い/attachments/`で、古い答案写真のファイルが削除され、新しいファイルに置き換わっていることを確認する
4. 詳細パネルで変更内容が反映されていることを確認する
5. 二群に振り分けた間違いを編集しても、二群のままであることを確認する（一群タブに戻っていないこと）

Expected: 上記すべてが問題なく動作する。

- [ ] **Step 4: 問題があれば修正し、該当タスクに戻って追加コミット**

---

## Self-Review メモ

- **スペック網羅**: §3(UI・ルーティング)→Task5-7、§4(書込・API)→Task1-4でカバー。§2のスコープ外事項（count/date編集UI・group変更）はどのタスクにも実装しておらず、意図通り対象外。
- **型整合**: `UpdateMistakeInput`(write.ts)・`UpdateMistakePayload`(api.ts)のフィールド名・型が一致していることを確認済み（`CreateMistakeInput`/`CreateMistakePayload`から`count`/`date`を除いた形）。`updateMistake`/`updateMistakeApi`の呼び出しシグネチャもTask2〜5間で一致。
- **プレースホルダーなし**: 全ステップに実コードを記載。
