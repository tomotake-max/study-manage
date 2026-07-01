# 間違い直し 一群/二群振り分け・テキスト登録改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 間違い直し画面に一群(要復習)/二群(直しずみ)の振り分けを追加し、vaultへの実書込APIを新設。間違い追加フォームのテキスト名をプルダウン化しページ数を分離、Aqua Voice辞書登録支援パネルを追加する。

**Architecture:** `MistakeNote.done`を`group: 1|2`に置き換え、`pipeline/src/write.ts`にvault書込ロジックを集約。`app-dashboard`にVite開発サーバー専用の`/api/*`ミドルウェアを追加してそれを呼び出す。書込後はReact側で楽観的更新→`data.json`再fetchで整合。

**Tech Stack:** TypeScript, Vite (`configureServer`ミドルウェア), gray-matter, vitest, React 18。既存のpnpm workspace構成を踏襲。

参照元: `docs/superpowers/specs/2026-07-02-mistakes-triage-design.md`

---

## File Structure

```
shared/
├─ src/schema.ts          MistakeNote変更 (done→group, textTitle/page追加)
├─ src/normalizeDigits.ts  新設: 全角→半角数字変換
├─ test/normalizeDigits.test.ts  新設
├─ vitest.config.ts        新設
└─ package.json            devDependencies(vitest)・testスクリプト追加
pipeline/
├─ src/write.ts            新設: setMistakeGroup/createMaterialStub/createMistake
├─ src/parse.ts            group読取・text_title/page→source合成に変更
├─ src/build.ts            reviewed/queued集計をgroup基準に変更
├─ test/write.test.ts      新設
├─ test/parse.test.ts      group関連テスト追加
└─ package.json            exports フィールド追加 ("./write")
app-dashboard/
├─ vite-plugins/vault-api.ts  新設: /api/* ミドルウェア
├─ vite.config.ts             プラグイン登録
├─ src/api.ts                 新設: fetchラッパー
├─ src/App.tsx                reload/onDataChange配線
├─ src/screens/Mistakes.tsx   一群/二群タブ・振り分けアクション
├─ src/screens/AddMistake.tsx テキスト名プルダウン・ページ正規化・実書込・辞書パネル
└─ package.json               pipeline をworkspace依存に追加
vault/間違い/2026-06-24-速さ-追い越し.md  solved→group移行
README.md                     書込機能の前提条件を追記
```

---

## Task 1: shared — MistakeNoteスキーマ変更 + normalizeDigits（TDD）

**Files:**
- Create: `shared/vitest.config.ts`, `shared/test/normalizeDigits.test.ts`, `shared/src/normalizeDigits.ts`
- Modify: `shared/package.json`, `shared/src/schema.ts`

- [ ] **Step 1: shared/package.json にテスト環境を追加**

```json
{
  "name": "shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/schema.ts",
  "exports": { ".": "./src/schema.ts", "./tokens.css": "./tokens.css" },
  "scripts": { "test": "vitest run" },
  "devDependencies": { "vitest": "^2.1.0", "typescript": "^5.6.0" }
}
```

- [ ] **Step 2: shared/vitest.config.ts を作成**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
```

- [ ] **Step 3: 失敗するテストを書く**

`shared/test/normalizeDigits.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeDigits } from "../src/normalizeDigits.js";

describe("normalizeDigits", () => {
  it("全角数字を半角に変換する", () => {
    expect(normalizeDigits("３２")).toBe("32");
  });

  it("半角数字はそのまま", () => {
    expect(normalizeDigits("32")).toBe("32");
  });

  it("数字以外の文字（範囲表記のハイフン等）はそのまま残す", () => {
    expect(normalizeDigits("３２−３４")).toBe("32−34");
  });

  it("空文字はそのまま", () => {
    expect(normalizeDigits("")).toBe("");
  });
});
```

- [ ] **Step 4: 依存をインストールしてテスト実行→失敗を確認**

Run: `pnpm install && pnpm --filter shared test`
Expected: FAIL（`src/normalizeDigits.ts` が存在しない）

- [ ] **Step 5: normalizeDigits.ts を実装**

`shared/src/normalizeDigits.ts`:

```ts
/** 全角数字(０-９)を半角数字(0-9)に変換する。数字以外の文字はそのまま。 */
export function normalizeDigits(input: string): string {
  return input.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}
```

- [ ] **Step 6: テスト実行して成功を確認**

Run: `pnpm --filter shared test`
Expected: PASS（4 tests）

- [ ] **Step 7: schema.ts で normalizeDigits を再エクスポートし、MistakeNote を変更**

`shared/src/schema.ts` の `MistakeNote` 定義を置き換える:

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
}
```

ファイル末尾（既存の `SUBJECT_IDS` の下）に追記:

```ts
export * from "./normalizeDigits.js";
```

- [ ] **Step 8: コミット**

```bash
git add shared/
git commit -m "feat: add normalizeDigits and replace MistakeNote.done with group"
```

---

## Task 2: pipeline — vault書込ロジック write.ts（TDD）

**Files:**
- Create: `pipeline/src/write.ts`, `pipeline/test/write.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`pipeline/test/write.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { setMistakeGroup, createMaterialStub, createMistake } from "../src/write.js";

let vaultDir: string;

beforeEach(async () => {
  vaultDir = await mkdtemp(path.join(tmpdir(), "studyboard-vault-"));
});

afterEach(async () => {
  await rm(vaultDir, { recursive: true, force: true });
});

describe("setMistakeGroup", () => {
  it("既存の間違いノートのgroupを更新し本文は保持する", async () => {
    const dir = path.join(vaultDir, "間違い");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "sample.md"),
      matter.stringify("メモ本文", { subject: "算数", group: 1 }),
      "utf8",
    );

    await setMistakeGroup(vaultDir, "sample", 2);

    const raw = await readFile(path.join(dir, "sample.md"), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.group).toBe(2);
    expect(parsed.content.trim()).toBe("メモ本文");
  });
});

describe("createMaterialStub", () => {
  it("新規テキストのスタブノートを作成する", async () => {
    const { id } = await createMaterialStub(vaultDir, "算数", "テスト用テキスト");
    const raw = await readFile(path.join(vaultDir, "教材", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.subject).toBe("算数");
    expect(parsed.data.title).toBe("テスト用テキスト");
    expect(parsed.data.material_type).toBe("book");
  });

  it("既に存在する場合は上書きしない（冪等）", async () => {
    await createMaterialStub(vaultDir, "算数", "テスト用テキスト");
    const file = path.join(vaultDir, "教材", "テスト用テキスト.md");
    await writeFile(
      file,
      matter.stringify("カスタムメモ", { subject: "算数", title: "テスト用テキスト", today_done: 99 }),
      "utf8",
    );

    await createMaterialStub(vaultDir, "算数", "テスト用テキスト");

    const raw = await readFile(file, "utf8");
    const parsed = matter(raw);
    expect(parsed.data.today_done).toBe(99);
    expect(parsed.content.trim()).toBe("カスタムメモ");
  });
});

describe("createMistake", () => {
  it("テキストカテゴリの間違いノートを新規作成する（source未設定・text_title/pageを保存）", async () => {
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "旅人算", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "旅人算の応用", note: "図を描かず計算した",
      count: 1, date: "7/2",
    });
    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.group).toBe(1);
    expect(parsed.data.text_title).toBe("プラスワン問題集");
    expect(parsed.data.page).toBe("45");
    expect(parsed.data.source).toBeUndefined();
    expect(parsed.content.trim()).toBe("図を描かず計算した");
  });

  it("テスト系カテゴリではsourceをそのまま保存する", async () => {
    const { id } = await createMistake(vaultDir, {
      subject: "国語", unit: "", theme: "第3回", category: "復習テスト",
      source: "6/21", reason: "おぼえていない", question: "漢字の書き取り", note: "",
      count: 1, date: "7/2",
    });
    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.source).toBe("6/21");
    expect(parsed.data.text_title).toBeUndefined();
  });

  it("同じ単元・テーマで衝突したら連番を付与する", async () => {
    const input = {
      subject: "算数" as const, unit: "速さ", theme: "旅人算", category: "テキスト" as const,
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "1問目", note: "",
      count: 1, date: "7/2",
    };
    const first = await createMistake(vaultDir, input);
    const second = await createMistake(vaultDir, { ...input, question: "2問目" });
    expect(second.id).not.toBe(first.id);
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter pipeline test write`
Expected: FAIL（`src/write.ts` が存在しない）

- [ ] **Step 3: write.ts を実装**

`pipeline/src/write.ts`:

```ts
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { SubjectName, MistakeCategory } from "shared";

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function sanitizeForFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "").trim();
}

export async function setMistakeGroup(vaultDir: string, id: string, group: 1 | 2): Promise<void> {
  const file = path.join(vaultDir, "間違い", `${id}.md`);
  const raw = await readFile(file, "utf8");
  const parsed = matter(raw);
  parsed.data.group = group;
  await writeFile(file, matter.stringify(parsed.content, parsed.data), "utf8");
}

export async function createMaterialStub(
  vaultDir: string,
  subject: SubjectName,
  title: string,
): Promise<{ id: string }> {
  const dir = path.join(vaultDir, "教材");
  await mkdir(dir, { recursive: true });
  const id = sanitizeForFilename(title);
  const file = path.join(dir, `${id}.md`);
  if (await fileExists(file)) return { id };

  const frontmatter = {
    type: "text",
    subject,
    title,
    publisher: "",
    material_type: "book",
    today_done: 0,
    themes: [],
  };
  await writeFile(file, matter.stringify("", frontmatter), "utf8");
  return { id };
}

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
}

export async function createMistake(
  vaultDir: string,
  fields: CreateMistakeInput,
): Promise<{ id: string }> {
  const dir = path.join(vaultDir, "間違い");
  await mkdir(dir, { recursive: true });

  const isoDate = new Date().toISOString().slice(0, 10);
  const base = sanitizeForFilename(`${isoDate}-${fields.unit || fields.theme}-${fields.theme}`);
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
    frontmatter.text_title = fields.textTitle;
    frontmatter.page = fields.page;
  } else {
    frontmatter.source = fields.source;
  }

  await writeFile(path.join(dir, `${id}.md`), matter.stringify(fields.note ?? "", frontmatter), "utf8");
  return { id };
}
```

- [ ] **Step 4: テスト実行して成功を確認**

Run: `pnpm --filter pipeline test write`
Expected: PASS（5 tests）

- [ ] **Step 5: コミット**

```bash
git add pipeline/src/write.ts pipeline/test/write.test.ts
git commit -m "feat: add vault write module (group toggle, material stub, mistake create)"
```

---

## Task 3: pipeline — parse.ts/build.ts をgroup基準に変更、既存データ移行（TDD）

**Files:**
- Modify: `pipeline/src/parse.ts`, `pipeline/src/build.ts`, `pipeline/test/parse.test.ts`, `vault/間違い/2026-06-24-速さ-追い越し.md`

- [ ] **Step 1: 失敗するテストを追加**

`pipeline/test/parse.test.ts` を以下に置き換え（既存テストに2件追加）:

```ts
import { describe, it, expect } from "vitest";
import { parseVault } from "../src/parse.js";
import path from "node:path";

const VAULT = path.resolve(__dirname, "../../vault");

describe("parseVault", () => {
  it("vault から教材・テスト・間違い・報告を読み分ける", async () => {
    const r = await parseVault(VAULT);
    expect(r.texts.find((t) => t.id === "プラスワン問題集")?.materialType).toBe("book");
    expect(r.texts.find((t) => t.title === "日々の演習")?.materialType).toBe("serial");
    expect(r.tests.some((t) => t.kind === "公開テスト")).toBe(true);
    expect(r.mistakes[0].subject).toBe("算数");
    expect(r.reports[0].plan.length).toBeGreaterThan(0);
  });

  it("既存の間違いノート(2026-06-24-速さ-追い越し)はgroup:1として読める", async () => {
    const r = await parseVault(VAULT);
    const m = r.mistakes.find((x) => x.id === "2026-06-24-速さ-追い越し");
    expect(m?.group).toBe(1);
    expect(m?.source).toBe("速さテキスト p.32");
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter pipeline test parse`
Expected: FAIL（`MistakeNote`に`done`しか無く型/値が合わない、または`group`が`undefined`）

- [ ] **Step 3: parse.ts の mistake ケースを書き換える**

`pipeline/src/parse.ts` の `case "mistake":` ブロックを以下に置き換え:

```ts
      case "mistake": {
        const isTextCategory = fm.category === "テキスト";
        const textTitle = isTextCategory ? (fm.text_title as string | undefined) : undefined;
        const page = isTextCategory ? (fm.page as string | undefined) : undefined;
        const source = textTitle
          ? `${textTitle}${page ? ` p.${page}` : ""}`
          : (fm.source as string);
        out.mistakes.push({
          id, subject: fm.subject as SubjectName, unit: fm.unit as string, theme: fm.theme as string,
          category: fm.category as MistakeNote["category"], source,
          textTitle, page,
          reason: fm.reason as string, question: fm.question as string,
          note: content, count: (fm.count as number) ?? 1,
          date: String(fm.date), group: (fm.group as 1 | 2) ?? 1,
        });
        break;
      }
```

- [ ] **Step 4: 既存サンプルノートのfrontmatterを移行**

`vault/間違い/2026-06-24-速さ-追い越し.md` の1行目を書き換え:

```diff
 date: 6/24
-solved: false
+group: 1
```

- [ ] **Step 5: テスト実行して成功を確認**

Run: `pnpm --filter pipeline test`
Expected: PASS（全テスト緑）

- [ ] **Step 6: build.ts の集計をgroup基準に変更**

`pipeline/src/build.ts` の `today` オブジェクト内、以下の行を書き換え:

```diff
-    today: { progressPct: 72, minutes: 84, goalMinutes: 120, reviewed: v.mistakes.filter((m) => m.done).length, queued: v.mistakes.filter((m) => !m.done).length },
+    today: { progressPct: 72, minutes: 84, goalMinutes: 120, reviewed: v.mistakes.filter((m) => m.group === 2).length, queued: v.mistakes.filter((m) => m.group === 1).length },
```

- [ ] **Step 7: ビルドを実行しdata.jsonが生成されることを確認**

Run: `pnpm --filter pipeline build`
Expected: `data.json written: .../app-dashboard/public/data.json`（エラーなし）

- [ ] **Step 8: コミット**

```bash
git add pipeline/src/parse.ts pipeline/src/build.ts pipeline/test/parse.test.ts vault/間違い/2026-06-24-速さ-追い越し.md
git commit -m "feat: read mistake group and text_title/page, migrate sample note"
```

---

## Task 4: ローカル書込API（Viteミドルウェア）

**Files:**
- Create: `app-dashboard/vite-plugins/vault-api.ts`
- Modify: `pipeline/package.json`, `app-dashboard/package.json`, `app-dashboard/vite.config.ts`

- [ ] **Step 1: pipeline/package.json に exports を追加**

```json
{
  "name": "pipeline",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/parse.ts",
    "./write": "./src/write.ts"
  },
  "scripts": {
    "build": "tsx src/build.ts",
    "watch": "tsx src/watch.ts",
    "test": "vitest run"
  },
  "dependencies": { "gray-matter": "^4.0.3", "glob": "^11.0.0", "chokidar": "^4.0.0", "shared": "workspace:*" },
  "devDependencies": { "tsx": "^4.19.0", "vitest": "^2.1.0", "typescript": "^5.6.0", "@types/node": "^22.0.0" }
}
```

- [ ] **Step 2: app-dashboard/package.json に pipeline 依存を追加**

```json
{
  "name": "app-dashboard",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc && vite build", "preview": "vite preview" },
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1", "lucide-react": "^0.456.0", "shared": "workspace:*", "pipeline": "workspace:*" },
  "devDependencies": { "@vitejs/plugin-react": "^4.3.0", "vite": "^5.4.0", "typescript": "^5.6.0", "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0", "@types/node": "^22.0.0" }
}
```

- [ ] **Step 3: 依存をインストール**

Run: `pnpm install`
Expected: 完了（lockfile更新、エラーなし）

- [ ] **Step 4: vault-api.ts を作成**

`app-dashboard/vite-plugins/vault-api.ts`:

```ts
import type { Plugin } from "vite";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setMistakeGroup, createMaterialStub, createMistake } from "pipeline/write";

const VAULT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../vault");

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function vaultApiPlugin(): Plugin {
  return {
    name: "vault-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/") || req.method !== "POST") {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        try {
          const groupMatch = req.url.match(/^\/api\/mistakes\/([^/]+)\/group$/);
          if (groupMatch) {
            const body = await readJsonBody(req);
            await setMistakeGroup(VAULT, decodeURIComponent(groupMatch[1]), body.group as 1 | 2);
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          if (req.url === "/api/materials") {
            const body = await readJsonBody(req);
            const result = await createMaterialStub(VAULT, body.subject as any, body.title as string);
            res.end(JSON.stringify(result));
            return;
          }
          if (req.url === "/api/mistakes") {
            const body = await readJsonBody(req);
            const result = await createMistake(VAULT, body as any);
            res.end(JSON.stringify(result));
            return;
          }
          next();
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });
    },
  };
}
```

- [ ] **Step 5: vite.config.ts にプラグインを登録**

`app-dashboard/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vaultApiPlugin } from "./vite-plugins/vault-api";
export default defineConfig({ plugins: [react(), vaultApiPlugin()] });
```

- [ ] **Step 6: 手動で動作確認（自動テスト対象外・開発サーバーのミドルウェアのため）**

Run: `pnpm dev`（別ターミナル）、続けて:

```bash
curl -s -X POST http://localhost:5173/api/mistakes/2026-06-24-速さ-追い越し/group \
  -H "Content-Type: application/json" -d '{"group":2}'
cat vault/間違い/2026-06-24-速さ-追い越し.md
```

Expected: `{"ok":true}` が返り、ファイル内の `group: 1` が `group: 2` に変わっている。確認後、`group: 1` に戻しておく（`curl ... -d '{"group":1}'`）。

- [ ] **Step 7: コミット**

```bash
git add app-dashboard/vite-plugins app-dashboard/vite.config.ts app-dashboard/package.json pipeline/package.json pnpm-lock.yaml
git commit -m "feat: add local vault write API via Vite dev middleware"
```

---

## Task 5: クライアントAPIヘルパー + App.tsx のreload配線

**Files:**
- Create: `app-dashboard/src/api.ts`
- Modify: `app-dashboard/src/App.tsx`

- [ ] **Step 1: api.ts を作成**

`app-dashboard/src/api.ts`:

```ts
import type { MistakeCategory, SubjectName } from "shared";

export async function setMistakeGroupApi(id: string, group: 1 | 2): Promise<void> {
  const res = await fetch(`/api/mistakes/${encodeURIComponent(id)}/group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group }),
  });
  if (!res.ok) throw new Error("振り分けの保存に失敗しました");
}

export async function createMaterialApi(subject: SubjectName, title: string): Promise<{ id: string }> {
  const res = await fetch("/api/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, title }),
  });
  if (!res.ok) throw new Error("テキストの登録に失敗しました");
  return res.json();
}

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
}

export async function createMistakeApi(payload: CreateMistakePayload): Promise<{ id: string }> {
  const res = await fetch("/api/mistakes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("間違いの保存に失敗しました");
  return res.json();
}
```

- [ ] **Step 2: App.tsx に reload と onDataChange を追加**

`app-dashboard/src/App.tsx` の該当箇所を書き換え:

```diff
 export function App() {
   const [data, setData] = useState<DashboardData | null>(null);
   const [page, setPage] = useState<Page>("home");
   const [matSubject, setMatSubject] = useState<string>("all");
 
   useEffect(() => {
     loadData().then(setData);
   }, []);
 
   if (!data) return <div style={{ padding: 40 }}>読み込み中…</div>;
+
+  const reload = () => { loadData().then(setData); };
```

`screen` の分岐部分を書き換え:

```diff
-  else if (page === "mistakes") screen = <Mistakes data={data} onAdd={() => go("add")} />;
-  else if (page === "add") screen = <AddMistake data={data} onBack={() => go("mistakes")} />;
+  else if (page === "mistakes") screen = <Mistakes data={data} onAdd={() => go("add")} onDataChange={setData} reload={reload} />;
+  else if (page === "add") screen = <AddMistake data={data} onBack={() => go("mistakes")} reload={reload} />;
```

- [ ] **Step 3: コミット**

```bash
git add app-dashboard/src/api.ts app-dashboard/src/App.tsx
git commit -m "feat: add vault-api client helpers and reload wiring"
```

---

## Task 6: Mistakes画面 — 一群/二群タブ・振り分けアクション

**Files:**
- Modify: `app-dashboard/src/screens/Mistakes.tsx`

- [ ] **Step 1: Mistakes.tsx 全体を以下に置き換え**

```tsx
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
    setPendingId(id);
    try {
      await setMistakeGroupApi(id, group);
      props.onDataChange((d) => ({
        ...d,
        mistakes: d.mistakes.map((m) => (m.id === id ? { ...m, group } : m)),
      }));
      if (selectedId === id) setSelectedId(null);
      setTimeout(() => props.reload(), 800);
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
          item={selected}
          pending={selected.id === pendingId}
          onClose={() => setSelectedId(null)}
          onMoveGroup={(g) => moveGroup(selected.id, g)}
        />
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
```

- [ ] **Step 2: 手動で動作確認**

Run: `pnpm dev`（`pnpm watch:data` も別ターミナルで起動しておく）。ブラウザで「間違い直し」を開き、一覧の行の右端ボタンをクリック→行が消える→「二群」タブに切り替えて表示されることを確認。`vault/間違い/2026-06-24-速さ-追い越し.md` の `group` が実際に書き換わっていることも確認。

Expected: タブ切替で表示が変わり、vaultファイルのgroup値が更新される。

- [ ] **Step 3: コミット**

```bash
git add app-dashboard/src/screens/Mistakes.tsx
git commit -m "feat: add 一群/二群 tabs and triage action to Mistakes screen"
```

---

## Task 7: AddMistake画面 — テキスト名プルダウン・ページ正規化・実書込・辞書登録支援

**Files:**
- Modify: `app-dashboard/src/screens/AddMistake.tsx`

- [ ] **Step 1: import 追加とヘルパー定義（ファイル冒頭）**

`app-dashboard/src/screens/AddMistake.tsx` の先頭 import 群に追加:

```diff
 import { useState, useRef } from "react";
-import type { DashboardData, MistakeCategory, SubjectName } from "shared";
+import { useEffect } from "react";
+import type { DashboardData, MistakeCategory, SubjectName } from "shared";
+import { normalizeDigits } from "shared";
+import { createMaterialApi, createMistakeApi } from "../api";
 import { SectionTitle } from "../chrome/SectionTitle";
```

- [ ] **Step 2: 辞書登録支援パネルのコンポーネントを追加**

`AddMistake.tsx` 内、`const CATEGORIES`/`const SUBJECTS` 定義の直後に追加:

```tsx
const NEW_TEXT_VALUE = "__new__";

function DictionaryPanel({ texts, onClose }: { texts: DashboardData["texts"]; onClose: () => void }) {
  const bySubject = SUBJECTS.map((s) => ({
    subject: s,
    titles: Array.from(new Set(texts.filter((t) => t.subject === s).map((t) => t.title))),
  })).filter((g) => g.titles.length > 0);

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(44,42,38,0.35)",
        display: "grid", placeItems: "center", zIndex: 50,
      }}
    >
      <Card style={{ width: 480, maxHeight: "80vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: "1.1rem" }}>辞書登録用テキスト一覧</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)" }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-soft)", marginBottom: 18 }}>
          Aqua Voiceの辞書（Settings → Dictionary）に手動で登録すると、音声入力の誤認識が減ります。
          コピーして貼り付けてください（Aqua Voice側の自動インポートには対応していません）。
        </p>
        {bySubject.map((g) => (
          <div key={g.subject} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="eyebrow">{g.subject}</span>
              <Button variant="ghost" size="sm" onClick={() => copy(g.titles.join("\n"))}>
                コピー
              </Button>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--ink)" }}>
              {g.titles.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ))}
        {bySubject.length === 0 && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-faint)" }}>
            登録されているテキストがありません。
          </p>
        )}
        <div style={{ textAlign: "right", marginTop: 8 }}>
          <Button variant="solid" size="sm" onClick={() => copy(bySubject.flatMap((g) => g.titles).join("\n"))}>
            全てコピー
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: AddMistake コンポーネントの state とハンドラを書き換え**

関数シグネチャとstate定義部分を書き換え:

```diff
-export function AddMistake(props: { data: DashboardData; onBack: () => void }) {
+export function AddMistake(props: { data: DashboardData; onBack: () => void; reload: () => void }) {
   const { reasons } = props.data;
   const [cat, setCat] = useState<MistakeCategory>(CATEGORIES[0]);
   const [subject, setSubject] = useState<SubjectName>(SUBJECTS[0]);
   const [reason, setReason] = useState<string>(reasons[0] ?? "");
   const [unit, setUnit] = useState("");
   const [theme, setTheme] = useState("");
-  const [source, setSource] = useState("");
+  const [source, setSource] = useState("");
+  const [textTitle, setTextTitle] = useState("");
+  const [newTextTitle, setNewTextTitle] = useState("");
+  const [page, setPageRaw] = useState("");
+  const setPage = (v: string) => setPageRaw(normalizeDigits(v));
+  const [showDictionary, setShowDictionary] = useState(false);
+  const [saving, setSaving] = useState(false);
   const [question, setQuestion] = useState("");
   const [note, setNote] = useState("");
   const [saved, setSaved] = useState(false);
   const [photo1, setPhoto1] = useState<File | null>(null);
   const [photo1Preview, setPhoto1Preview] = useState<string | null>(null);
   const [photo2, setPhoto2] = useState<File | null>(null);
   const [photo2Preview, setPhoto2Preview] = useState<string | null>(null);
 
   const isText = cat === "テキスト";
+
+  useEffect(() => {
+    setTextTitle("");
+    setNewTextTitle("");
+  }, [subject]);
+
+  const subjectTexts = Array.from(
+    new Set(props.data.texts.filter((t) => t.subject === subject).map((t) => t.title)),
+  );
```

- [ ] **Step 4: handleSave を実書込に置き換え**

```diff
-  function handleSave() {
-    // In Phase 1, files are stored in state but not actually persisted
-    // In Phase 2, these would be uploaded to a server or storage service
-    console.log("Saving mistake with photos:", {
-      photo1: photo1?.name,
-      photo2: photo2?.name,
-    });
-    setSaved(true);
-    setTimeout(() => props.onBack(), 700);
-  }
+  async function handleSave() {
+    setSaving(true);
+    try {
+      const finalTextTitle = textTitle === NEW_TEXT_VALUE ? newTextTitle.trim() : textTitle;
+      if (isText && textTitle === NEW_TEXT_VALUE && finalTextTitle) {
+        await createMaterialApi(subject, finalTextTitle);
+      }
+      const today = new Date();
+      const date = `${today.getMonth() + 1}/${today.getDate()}`;
+      await createMistakeApi({
+        subject, unit, theme, category: cat,
+        ...(isText ? { textTitle: finalTextTitle, page } : { source }),
+        reason, question, note, count: 1, date,
+      });
+      // 写真(photo1/photo2)は今回のスコープでは保存しない
+      setSaved(true);
+      props.reload();
+      setTimeout(() => props.onBack(), 700);
+    } finally {
+      setSaving(false);
+    }
+  }
```

- [ ] **Step 5: 出典欄のJSXを テキスト名プルダウン + ページ数 に置き換え**

既存の以下のブロックを:

```tsx
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
          <Field label={isText ? "細目（テーマ）" : "テスト名"}>
            <input
              style={fieldStyle}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={isText ? "追い越し" : "第18回 復習テスト"}
            />
          </Field>
          <Field label={isText ? "出典・ページ" : "日付"}>
            <input
              style={fieldStyle}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={isText ? "速さテキスト p.32" : "6/21"}
            />
          </Field>
        </div>
```

以下に置き換える:

```tsx
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
          <Field label={isText ? "細目（テーマ）" : "テスト名"}>
            <input
              style={fieldStyle}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={isText ? "追い越し" : "第18回 復習テスト"}
            />
          </Field>
          {isText ? (
            <Field label="テキスト名">
              <select style={fieldStyle} value={textTitle} onChange={(e) => setTextTitle(e.target.value)}>
                <option value="" disabled>選択してください</option>
                {subjectTexts.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value={NEW_TEXT_VALUE}>＋ 新しいテキストを追加</option>
              </select>
              {textTitle === NEW_TEXT_VALUE && (
                <input
                  style={{ ...fieldStyle, marginTop: 8 }}
                  value={newTextTitle}
                  onChange={(e) => setNewTextTitle(e.target.value)}
                  placeholder="新しいテキスト名"
                />
              )}
              <button
                type="button"
                onClick={() => setShowDictionary(true)}
                style={{
                  border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)",
                  fontSize: 12, textDecoration: "underline", padding: "6px 0 0",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                <Icon name="book-open-check" size={13} /> 辞書登録用一覧を見る
              </button>
            </Field>
          ) : (
            <Field label="日付">
              <input
                style={fieldStyle}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="6/21"
              />
            </Field>
          )}
        </div>

        {isText && (
          <div style={{ marginTop: 22, maxWidth: 200 }}>
            <Field label="ページ数">
              <input
                style={fieldStyle}
                value={page}
                onChange={(e) => setPage(e.target.value)}
                placeholder="32"
                inputMode="numeric"
              />
            </Field>
          </div>
        )}

        {showDictionary && (
          <DictionaryPanel texts={props.data.texts} onClose={() => setShowDictionary(false)} />
        )}
```

- [ ] **Step 6: 保存ボタンの disabled/表示テキストを保存中対応に変更**

```diff
           <Button variant="ghost" onClick={props.onBack}>
             キャンセル
           </Button>
-          <Button variant="solid" iconLeft={<Icon name="check" size={16} />} onClick={handleSave}>
-            間違いを保存
+          <Button variant="solid" iconLeft={<Icon name="check" size={16} />} onClick={handleSave}>
+            {saving ? "保存中…" : "間違いを保存"}
           </Button>
```

- [ ] **Step 7: App.tsx の呼び出し元に reload を渡す（Task 5で対応済みか確認）**

Task 5 Step 2 で `<AddMistake data={data} onBack={() => go("mistakes")} reload={reload} />` が反映済みであることを確認する。未反映なら追加する。

- [ ] **Step 8: 手動で動作確認**

Run: `pnpm dev` + `pnpm watch:data`。「間違いを追加」から、科目を選び、テキスト名プルダウンで「＋ 新しいテキストを追加」を選び新規タイトルを入力、ページ数に全角「３２」を入力→半角「32」に変わることを確認。保存後、`vault/教材/`に新規ノートが、`vault/間違い/`に新規間違いノートが作成されていることを確認。

Expected: 両方のvaultファイルが新規作成され、`data.json`再生成後に一覧に反映される。

- [ ] **Step 9: コミット**

```bash
git add app-dashboard/src/screens/AddMistake.tsx
git commit -m "feat: add text title dropdown, page normalization, real save, and dictionary panel"
```

---

## Task 8: README更新

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 書込機能の前提条件を追記**

`README.md` の「## 使い方」セクションの直後に追記:

```diff
 開発フロー: `pnpm watch:data` と `pnpm dev` を両方立ち上げておくと、`vault/` の `.md` を
 編集・保存するたびに `data.json` が再生成され、ブラウザを再読込すると反映される。
+
+## 間違い直しの振り分け・追加機能について
+
+間違い直し画面の一群/二群振り分け、テキスト新規登録、間違いの新規追加は、ダッシュボードから
+直接 `vault/` にファイルを書き込む。この機能を使うには `pnpm dev` と `pnpm watch:data` の
+**両方**を起動しておく必要がある（`pnpm dev` の開発サーバーが書込APIを提供し、
+`pnpm watch:data` がvaultの変更を検知して`data.json`を再生成する）。書込APIは開発サーバー
+専用で、`pnpm build`後の静的サイトには存在しない。
```

- [ ] **Step 2: コミット**

```bash
git add README.md
git commit -m "docs: document vault write API prerequisites"
```

---

## Task 9: 最終確認

- [ ] **Step 1: 全パッケージのテストを実行**

Run: `pnpm --filter shared test && pnpm --filter pipeline test`
Expected: 全テストPASS

- [ ] **Step 2: 通しの手動確認**

Run: `pnpm build:data && pnpm dev`（別ターミナルで `pnpm watch:data` も起動）
ブラウザで以下を確認:
1. 「間違い直し」で一群⇄二群タブが切り替わり、振り分けボタンでvaultファイルの`group`が実際に変わる
2. 「間違いを追加」でテキスト名プルダウンが科目でフィルタされ、「＋新しいテキストを追加」が機能する
3. ページ数に全角数字を入れると半角表示になる
4. 保存後、一覧に新しい間違いが実際に反映される（`vault/間違い/`に新規ファイルができている）
5. 「辞書登録用一覧を見る」でパネルが開き、コピーボタンが機能する

Expected: 上記すべてが問題なく動作する。

- [ ] **Step 3: 問題があれば修正し、該当タスクに戻って追加コミット**
