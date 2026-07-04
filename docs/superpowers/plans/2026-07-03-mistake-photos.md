# 間違い直し 写真の保存・表示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 間違い追加フォームで選択した写真（問題側・答案側）を実際にvaultへ保存し、間違い直し画面の詳細パネルで実際に表示できるようにする（答案側は登録フォームと同じ「ぼかし→クリックで表示」）。

**Architecture:** クライアントで写真をbase64 data URLに変換して`/api/mistakes`へ送信 → `pipeline/src/write.ts`がデコードして`vault/間違い/attachments/`に実ファイル保存しfrontmatterへファイル名を記録 → `pipeline/src/parse.ts`がURLパスへ変換 → `pipeline/src/build.ts`が`attachments/`ディレクトリを丸ごと`app-dashboard/public/attachments/`へコピーして静的配信。

**Tech Stack:** 既存のTypeScript/Vite/vitestスタックをそのまま使用。新規依存追加なし（`Buffer`/`node:fs/promises`の`cp`のみ）。

参照元: `docs/superpowers/specs/2026-07-03-mistake-photos-design.md`

---

## File Structure

```
shared/src/schema.ts              MistakeNote に questionPhoto?/answerPhoto? 追加
pipeline/src/write.ts             createMistake に写真デコード・保存ロジック追加
pipeline/src/parse.ts             question_photo/answer_photo フロントマターを読み取り
pipeline/src/build.ts             vault/間違い/attachments/ → app-dashboard/public/attachments/ コピー
pipeline/test/write.test.ts       写真保存のテスト追加
pipeline/test/parse.test.ts       写真パースのテスト追加
app-dashboard/src/api.ts          CreateMistakePayload に写真フィールド追加
app-dashboard/src/screens/AddMistake.tsx   保存時にFile→base64変換して送信
app-dashboard/src/screens/Mistakes.tsx     詳細パネルで実写真表示（答案側はぼかし→クリック）
.gitignore                        app-dashboard/public/attachments/ 追加
```

---

## Task 1: shared — MistakeNoteスキーマ変更

**Files:**
- Modify: `shared/src/schema.ts`

- [ ] **Step 1: MistakeNote に写真フィールドを追加**

`shared/src/schema.ts` の `MistakeNote` interface を以下に置き換え:

```ts
// ── 間違いノート ─────────────────────────
export type MistakeCategory = "テキスト" | "復習テスト" | "公開テスト";
export interface MistakeNote {
  id: string;
  subject: SubjectName;
  unit: string;
  theme: string;
  category: MistakeCategory;
  source: string;                   // 表示用。テキスト時はpipelineがtextTitle+pageから自動合成
  textTitle?: string;                // category==="テキスト"のときのみ
  page?: string;                     // category==="テキスト"のときのみ。半角正規化済み
  reason: string;
  question: string;
  note: string;
  count: number;
  date: string;
  group: 1 | 2;                      // 1=一群（要復習・ストック中）, 2=二群（直しずみ・ストック外）
  questionPhoto?: string;            // 表示用URLパス（例: "/attachments/xxx-question.jpg"）。未アップロード時は未設定
  answerPhoto?: string;              // 同上（答案・解答用紙側）
}
```

- [ ] **Step 2: コミット**

```bash
git add shared/src/schema.ts
git commit -m "feat: add questionPhoto/answerPhoto fields to MistakeNote"
```

---

## Task 2: pipeline — write.ts に写真保存ロジックを追加（TDD）

**Files:**
- Modify: `pipeline/src/write.ts`, `pipeline/test/write.test.ts`

- [ ] **Step 1: 失敗するテストを追加**

`pipeline/test/write.test.ts` の末尾（`describe("createMistake", ...)` ブロックの最後、`});`の直前）に以下を追加:

```ts
  it("questionPhotoDataUrl/answerPhotoDataUrlを渡すと添付ファイルとして保存しfrontmatterに記録する", async () => {
    const TINY_PNG =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "旅人算写真", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "写真つきの問題", note: "",
      count: 1, date: "7/3",
      questionPhotoDataUrl: TINY_PNG,
      answerPhotoDataUrl: TINY_PNG,
    });

    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.question_photo).toBe(`${id}-question.png`);
    expect(parsed.data.answer_photo).toBe(`${id}-answer.png`);

    const questionBuf = await readFile(path.join(vaultDir, "間違い", "attachments", `${id}-question.png`));
    expect(questionBuf.length).toBeGreaterThan(0);
    const answerBuf = await readFile(path.join(vaultDir, "間違い", "attachments", `${id}-answer.png`));
    expect(answerBuf.length).toBeGreaterThan(0);
  });

  it("写真を渡さない場合はattachmentsもfrontmatterのphotoフィールドも作らない", async () => {
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "旅人算写真なし", category: "テキスト",
      textTitle: "プラスワン問題集", page: "10",
      reason: "計算ミス", question: "写真なしの問題", note: "",
      count: 1, date: "7/3",
    });
    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.question_photo).toBeUndefined();
    expect(parsed.data.answer_photo).toBeUndefined();
  });

  it("不正な形式のdata URLはエラーを投げる", async () => {
    await expect(
      createMistake(vaultDir, {
        subject: "算数", unit: "速さ", theme: "不正データURL", category: "テキスト",
        textTitle: "プラスワン問題集", page: "1",
        reason: "計算ミス", question: "不正データURLの問題", note: "",
        count: 1, date: "7/3",
        questionPhotoDataUrl: "not-a-data-url",
      }),
    ).rejects.toThrow();
  });
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter pipeline test write`
Expected: FAIL（`CreateMistakeInput`に`questionPhotoDataUrl`/`answerPhotoDataUrl`が無く型エラー、または実行時に写真が保存されない）

- [ ] **Step 3: write.ts に写真デコード・保存ロジックを実装**

`pipeline/src/write.ts` の `CreateMistakeInput` interface を以下に置き換え（末尾に2フィールド追加）:

```ts
export interface CreateMistakeInput {
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
  count: number;
  date: string;
  questionPhotoDataUrl?: string;
  answerPhotoDataUrl?: string;
}
```

`sanitizeForFilename`関数の直後に、写真デコード用のヘルパーを追加:

```ts
function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function decodeDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    throw new Error("invalid data URL");
  }
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function savePhoto(
  vaultDir: string,
  id: string,
  suffix: "question" | "answer",
  dataUrl: string,
): Promise<string> {
  const { mimeType, buffer } = decodeDataUrl(dataUrl);
  const ext = extensionForMimeType(mimeType);
  const dir = path.join(vaultDir, "間違い", "attachments");
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${suffix}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}
```

`createMistake`関数本体を以下に置き換え（frontmatter組み立て部分を拡張）:

```ts
export async function createMistake(
  vaultDir: string,
  fields: CreateMistakeInput,
): Promise<{ id: string }> {
  const dir = path.join(vaultDir, "間違い");
  await mkdir(dir, { recursive: true });

  const isoDate = new Date().toISOString().slice(0, 10);
  const base = sanitizeForFilename(`${isoDate}-${fields.unit || fields.theme}-${fields.theme}`);
  if (base === "") {
    throw new Error("unit/theme required");
  }
  let id = base;
  let n = 2;
  while (await fileExists(path.join(dir, `${id}.md`))) {
    id = `${base}-${n}`;
    n++;
  }

  const frontmatter: Record<string, unknown> = {
    subject: fields.subject,
    unit: fields.unit,
    theme: fields.theme,
    category: fields.category,
    reason: fields.reason,
    question: fields.question,
    count: fields.count,
    date: fields.date,
    group: 1,
  };
  if (fields.category === "テキスト") {
    frontmatter.text_title = fields.textTitle ?? "";
    frontmatter.page = fields.page ?? "";
  } else {
    frontmatter.source = fields.source ?? "";
  }

  if (fields.questionPhotoDataUrl) {
    frontmatter.question_photo = await savePhoto(vaultDir, id, "question", fields.questionPhotoDataUrl);
  }
  if (fields.answerPhotoDataUrl) {
    frontmatter.answer_photo = await savePhoto(vaultDir, id, "answer", fields.answerPhotoDataUrl);
  }

  await writeFile(path.join(dir, `${id}.md`), matter.stringify(fields.note ?? "", frontmatter), "utf8");
  return { id };
}
```

- [ ] **Step 4: テスト実行して成功を確認**

Run: `pnpm --filter pipeline test write`
Expected: PASS（15 tests — 既存12 + 新規3）

- [ ] **Step 5: コミット**

```bash
git add pipeline/src/write.ts pipeline/test/write.test.ts
git commit -m "feat: save question/answer photos as vault attachments"
```

---

## Task 3: pipeline — parse.ts で写真フィールドを読み取る（TDD）

**Files:**
- Modify: `pipeline/src/parse.ts`, `pipeline/test/parse.test.ts`

- [ ] **Step 1: 失敗するテストを追加**

`pipeline/test/parse.test.ts` の `describe("parseVault", ...)` ブロック内、`describe("text_title/pageからのsource合成", ...)` ブロックの直後（同じ階層、`});`の前）に以下を追加:

```ts

  describe("写真フィールドのパース", () => {
    let vaultDir: string;

    afterEach(async () => {
      await rm(vaultDir, { recursive: true, force: true });
    });

    it("question_photo/answer_photoがあればURLパスとして読み込む", async () => {
      vaultDir = await mkdtemp(path.join(tmpdir(), "studyboard-parse-photo-"));
      const TINY_PNG =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      const { id } = await createMistake(vaultDir, {
        subject: "算数", unit: "速さ", theme: "旅人算写真", category: "テキスト",
        textTitle: "プラスワン問題集", page: "45",
        reason: "計算ミス", question: "写真つきの問題", note: "",
        count: 1, date: "7/3",
        questionPhotoDataUrl: TINY_PNG,
        answerPhotoDataUrl: TINY_PNG,
      });

      const r = await parseVault(vaultDir);
      const m = r.mistakes.find((x) => x.id === id);
      expect(m?.questionPhoto).toBe(`/attachments/${id}-question.png`);
      expect(m?.answerPhoto).toBe(`/attachments/${id}-answer.png`);
    });

    it("写真が無ければquestionPhoto/answerPhotoはundefined", async () => {
      const r = await parseVault(VAULT);
      const m = r.mistakes.find((x) => x.id === "2026-06-24-速さ-追い越し");
      expect(m?.questionPhoto).toBeUndefined();
      expect(m?.answerPhoto).toBeUndefined();
    });
  });
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter pipeline test parse`
Expected: FAIL（`MistakeNote`のパース結果に`questionPhoto`/`answerPhoto`が含まれない）

- [ ] **Step 3: parse.test.ts の import に createMistake を追加**

`pipeline/test/parse.test.ts` の先頭 import 文を確認し、`import { createMistake } from "../src/write.js";` が既に無ければ追加する（既存のTask 3実装で既に追加済みのはずなので、無い場合のみ追加）。

- [ ] **Step 4: parse.ts の mistake ケースを書き換える**

`pipeline/src/parse.ts` の `case "mistake":` ブロックを以下に置き換え:

```ts
      case "mistake": {
        const isTextCategory = fm.category === "テキスト";
        const textTitle = isTextCategory ? (fm.text_title as string | undefined) : undefined;
        const page = isTextCategory ? (fm.page as string | undefined) : undefined;
        const source = textTitle
          ? `${textTitle}${page ? ` p.${page}` : ""}`
          : (fm.source as string);
        const questionPhotoFile = fm.question_photo as string | undefined;
        const answerPhotoFile = fm.answer_photo as string | undefined;
        out.mistakes.push({
          id, subject: fm.subject as SubjectName, unit: fm.unit as string, theme: fm.theme as string,
          category: fm.category as MistakeNote["category"], source,
          textTitle, page,
          questionPhoto: questionPhotoFile ? `/attachments/${questionPhotoFile}` : undefined,
          answerPhoto: answerPhotoFile ? `/attachments/${answerPhotoFile}` : undefined,
          reason: fm.reason as string, question: fm.question as string,
          note: content, count: (fm.count as number) ?? 1,
          date: String(fm.date), group: (fm.group as 1 | 2) ?? 1,
        });
        break;
      }
```

- [ ] **Step 5: テスト実行して成功を確認**

Run: `pnpm --filter pipeline test`
Expected: PASS（全テスト緑）

- [ ] **Step 6: コミット**

```bash
git add pipeline/src/parse.ts pipeline/test/parse.test.ts
git commit -m "feat: parse question_photo/answer_photo into URL paths"
```

---

## Task 4: pipeline — build.ts で attachments を配信用フォルダへコピー

**Files:**
- Modify: `pipeline/src/build.ts`, `.gitignore`

- [ ] **Step 1: .gitignore に追加**

`.gitignore` に以下の行を追加（`app-dashboard/public/data.json`の行の直後）:

```diff
 node_modules/
 dist/
 app-dashboard/public/data.json
+app-dashboard/public/attachments/
 *.log
 .DS_Store
 .env.local
 app-dashboard/.env.local
```

- [ ] **Step 2: build.ts にコピー処理を追加**

`pipeline/src/build.ts` の先頭 import を書き換え:

```diff
-import { writeFile, mkdir } from "node:fs/promises";
+import { writeFile, mkdir, cp } from "node:fs/promises";
```

`const OUT = ...` の行の直後に定数を追加:

```diff
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
 const VAULT = path.join(ROOT, "vault");
 const OUT = path.join(ROOT, "app-dashboard/public/data.json");
+const ATTACHMENTS_SRC = path.join(VAULT, "間違い", "attachments");
+const ATTACHMENTS_OUT = path.join(ROOT, "app-dashboard/public/attachments");
+
+async function copyAttachments(): Promise<void> {
+  try {
+    await cp(ATTACHMENTS_SRC, ATTACHMENTS_OUT, { recursive: true });
+  } catch (e) {
+    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
+  }
+}
```

`build`関数の末尾、`await mkdir(path.dirname(OUT), { recursive: true });` の直後に呼び出しを追加:

```diff
   await mkdir(path.dirname(OUT), { recursive: true });
+  await copyAttachments();
   await writeFile(OUT, JSON.stringify(data, null, 2), "utf8");
   return data;
```

- [ ] **Step 3: ビルドを実行して確認**

Run: `pnpm --filter pipeline build`
Expected: `data.json written: .../app-dashboard/public/data.json`（エラーなし。この時点では`vault/間違い/attachments/`がまだ存在しないため、コピーはスキップされ何も起きない ＝ ENOENTを握りつぶす分岐が正しく動く）

- [ ] **Step 4: 一時的に添付ファイルを置いてコピーされることを確認**

Run:
```bash
mkdir -p vault/間違い/attachments
echo "dummy" > vault/間違い/attachments/test.txt
pnpm --filter pipeline build
ls app-dashboard/public/attachments/
rm -rf vault/間違い/attachments
```
Expected: `test.txt` が `app-dashboard/public/attachments/` にコピーされている。確認後、`vault/間違い/attachments`と`app-dashboard/public/attachments`をどちらも削除しておく（テスト用の一時ファイルなのでコミットしない）。

- [ ] **Step 5: コミット**

```bash
git add pipeline/src/build.ts .gitignore
git commit -m "feat: copy vault mistake attachments to app-dashboard/public for serving"
```

---

## Task 5: app-dashboard — api.ts に写真フィールドを追加

**Files:**
- Modify: `app-dashboard/src/api.ts`

- [ ] **Step 1: CreateMistakePayload に写真フィールドを追加**

`app-dashboard/src/api.ts` の `CreateMistakePayload` interface を以下に置き換え:

```ts
export interface CreateMistakePayload {
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
  count: number;
  date: string;
  questionPhotoDataUrl?: string;
  answerPhotoDataUrl?: string;
}
```

- [ ] **Step 2: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: `api.ts`自体はエラーなし（他のスクリーンファイルはTask 6/7で対応するまで一時的にエラーが出る可能性があるが、それは想定内）

- [ ] **Step 3: コミット**

```bash
git add app-dashboard/src/api.ts
git commit -m "feat: add photo data URL fields to CreateMistakePayload"
```

---

## Task 6: AddMistake画面 — 保存時に写真をbase64変換して送信

**Files:**
- Modify: `app-dashboard/src/screens/AddMistake.tsx`

- [ ] **Step 1: File→data URL変換のヘルパーを追加**

`app-dashboard/src/screens/AddMistake.tsx` の `const NEW_TEXT_VALUE = "__new__";` の直後に追加:

```ts
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 2: handleSave で写真を変換して送信する**

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
      const today = new Date();
      const date = `${today.getMonth() + 1}/${today.getDate()}`;
      const questionPhotoDataUrl = photo1 ? await fileToDataUrl(photo1) : undefined;
      const answerPhotoDataUrl = photo2 ? await fileToDataUrl(photo2) : undefined;
      await createMistakeApi({
        subject, unit, theme, category: cat,
        ...(isText ? { textTitle: finalTextTitle, page } : { source }),
        reason, question, note, count: 1, date,
        questionPhotoDataUrl, answerPhotoDataUrl,
      });
      setSaved(true);
      setTimeout(() => props.reload(), 800);
      setTimeout(() => props.onBack(), 700);
    } catch (e) {
      alert(e instanceof Error ? e.message : "間違いの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }
```

（変更点: 末尾のコメント「写真(photo1/photo2)は今回のスコープでは保存しない」を削除し、実際にbase64変換して`createMistakeApi`に渡すようにした）

- [ ] **Step 3: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: `AddMistake.tsx`自体はエラーなし

- [ ] **Step 4: 手動で動作確認**

Run: `pnpm dev`（`pnpm watch:data`も別ターミナルで起動）。「間違いを追加」画面でカテゴリ「テキスト」を選び、テキスト名・単元等を入力後、「テキストの該当箇所」と「答案・解答用紙」の両方に画像ファイルを選択（ローカルファイルでよい）。保存を押す。

Expected: 保存後、`vault/間違い/attachments/`に`<id>-question.<拡張子>`と`<id>-answer.<拡張子>`の2ファイルが作成されている。作成された間違いノートのfrontmatterに`question_photo`/`answer_photo`が記録されている。

- [ ] **Step 5: コミット**

```bash
git add app-dashboard/src/screens/AddMistake.tsx
git commit -m "feat: convert and send photos as data URLs on mistake save"
```

---

## Task 7: Mistakes画面 — 詳細パネルで実写真を表示（答案側はぼかし→クリック）

**Files:**
- Modify: `app-dashboard/src/screens/Mistakes.tsx`

- [ ] **Step 1: ConcealedPhoto コンポーネントを追加**

`app-dashboard/src/screens/Mistakes.tsx` の `import { useState } from "react";` の直後に `useState` を使うヘルパーコンポーネントを追加するため、ファイル冒頭の import 群はそのままに、`function MistakeRow(...)` の直前（`MistakeRow`関数定義の前）に以下を追加:

```tsx
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
```

- [ ] **Step 2: MistakeDetail の写真プレースホルダーを実写真表示に置き換え**

`MistakeDetail`関数内の以下のブロックを:

```tsx
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
```

以下に置き換える:

```tsx
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
```

- [ ] **Step 3: MistakeDetail をitem.idでkeyづけして写真の表示状態をアイテムごとにリセットする**

`Mistakes`関数内、`{selected && (` のブロックを以下に置き換え:

```diff
       {selected && (
         <MistakeDetail
+          key={selected.id}
           item={selected}
           pending={selected.id === pendingId}
           onClose={() => setSelectedId(null)}
           onMoveGroup={(g) => moveGroup(selected.id, g)}
         />
       )}
```

（`key`を付けることで、別の間違いに切り替えたときに答案写真の「ぼかし解除」状態が引き継がれず、毎回ぼかし状態から始まるようにする）

- [ ] **Step 4: 型チェックを確認**

Run: `cd app-dashboard && npx tsc --noEmit`
Expected: `Mistakes.tsx`関連のエラーなし

- [ ] **Step 5: 手動で動作確認**

Run: `pnpm dev` + `pnpm watch:data`（Task 6で保存した写真つきの間違いが既にある状態）。「間違い直し」画面で該当の間違いをクリックし詳細パネルを開く。

Expected: 「問題の写真」に実際の画像が表示される。「答案・解答用紙」はぼかされた状態で表示され、クリックすると鮮明になり「隠す」ボタンで再度ぼかせる。別の間違いに切り替えると、答案写真は再びぼかし状態から始まる。

- [ ] **Step 6: コミット**

```bash
git add app-dashboard/src/screens/Mistakes.tsx
git commit -m "feat: display saved question/answer photos in mistake detail panel"
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
1. 「間違いを追加」で写真2枚（問題側・答案側）を選んで保存
2. `vault/間違い/attachments/`に2ファイル作成されていることを確認
3. `app-dashboard/public/attachments/`にも同じファイルがコピーされていることを確認（`pnpm watch:data`のリビルドが走った後）
4. 「間違い直し」の一覧から該当の間違いを開き、問題の写真が表示され、答案はぼかされていてクリックで表示できることを確認
5. 別の間違い（写真なし）を選ぶとプレースホルダーが表示されることを確認

Expected: 上記すべてが問題なく動作する。

- [ ] **Step 4: 問題があれば修正し、該当タスクに戻って追加コミット**
