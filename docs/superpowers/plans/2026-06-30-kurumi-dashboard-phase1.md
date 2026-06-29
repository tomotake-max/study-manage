# くるみ 学習ダッシュボード Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obsidian保管庫のMarkdownノートから集計したデータを、プロトタイプ忠実なReactダッシュボード（読取専用）に表示する。

**Architecture:** `vault/*.md` を pipeline（gray-matter + glob）でパースし `subjectStats`/カレンダー生成を移植して `data.json` を生成。`app-dashboard`（Vite + React + TS）が `data.json` を fetch して表示。frontmatterの型は `shared/schema.ts` に集約し pipeline と app で共有。デザイントークン・UIプリミティブは欠落しているプロトタイプ資産をREADME記載とインラインstyleから再構築する。

**Tech Stack:** Node 20+, TypeScript, Vite, React 18, gray-matter, glob, chokidar, vitest, lucide-react。pnpm をパッケージマネージャに使う（npm でも可）。

参照元（見た目と集計の正解）:
- `ui_kits/kurumi-dashboard/data.js` — 集計ロジック・モックデータ・カレンダー生成（最重要）
- `ui_kits/kurumi-dashboard/*.jsx` — 各画面の見た目（移植元）
- `ui_kits/kurumi-dashboard/design_handoff_kurumi_dashboard/README.md` — 画面仕様・トークン

---

## File Structure

```
StudyBoard/
├─ package.json                  ルート（pnpm workspaces）
├─ pnpm-workspace.yaml
├─ shared/
│   ├─ package.json
│   ├─ src/schema.ts             frontmatter型 + 集計結果型
│   └─ tokens.css                デザイントークン（CSS変数）
├─ pipeline/
│   ├─ package.json
│   ├─ src/types.ts              raw frontmatter → 正規化型
│   ├─ src/parse.ts              glob + gray-matter で vault を読む
│   ├─ src/aggregate.ts          subjectStats / カレンダー plan・reports 生成
│   ├─ src/build.ts             parse → aggregate → data.json 書き出し（CLI）
│   ├─ src/watch.ts             chokidar で vault 監視 → build 再実行
│   └─ test/aggregate.test.ts
├─ vault/
│   ├─ 教材/ テスト/ 間違い/ 報告/    サンプル .md
└─ app-dashboard/
    ├─ package.json  vite.config.ts  index.html  tsconfig.json
    ├─ public/data.json            pipeline 出力（gitignore可）
    └─ src/
        ├─ main.tsx  App.tsx
        ├─ data.ts                 data.json fetch + 型付け
        ├─ ui/                     SideNav Button Badge Card ProgressBar Icon 等
        ├─ chrome/                 Wordmark TopBar SectionTitle HistoryStrip
        ├─ StudyCalendar.tsx
        └─ screens/                Dashboard Mistakes AddMistake Materials Calendar
```

---

## Task 1: ワークスペース初期化

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`

- [ ] **Step 1: ルート package.json を作成**

```json
{
  "name": "studyboard",
  "private": true,
  "scripts": {
    "build:data": "pnpm --filter pipeline build",
    "watch:data": "pnpm --filter pipeline watch",
    "dev": "pnpm --filter app-dashboard dev"
  }
}
```

- [ ] **Step 2: pnpm-workspace.yaml を作成**

```yaml
packages:
  - shared
  - pipeline
  - app-dashboard
```

- [ ] **Step 3: .gitignore を作成**

```
node_modules/
dist/
app-dashboard/public/data.json
*.log
```

- [ ] **Step 4: コミット**

```bash
git add package.json pnpm-workspace.yaml .gitignore
git commit -m "chore: init pnpm workspace"
```

---

## Task 2: 共有スキーマ（shared/schema.ts）

READMEのfrontmatterスキーマと `data.js` のデータモデルを型に落とす。pipeline と app の両方が import する。

**Files:**
- Create: `shared/package.json`, `shared/src/schema.ts`

- [ ] **Step 1: shared/package.json を作成**

```json
{
  "name": "shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/schema.ts",
  "exports": { ".": "./src/schema.ts", "./tokens.css": "./tokens.css" }
}
```

- [ ] **Step 2: shared/src/schema.ts を作成**

```ts
// ── 科目 ───────────────────────────────
export type SubjectName = "算数" | "国語" | "理科" | "社会";
export type SubjectId = "math" | "jp" | "sci" | "soc";

// ── 教材ノート（type: text）─────────────
export interface Theme { name: string; total: number; done: number; }
export interface SerialCurrent { label: string; unit: string; total: number; done: number; }

export interface TextMaterial {
  id: string;
  subject: SubjectName;
  title: string;
  publisher: string;
  materialType: "book" | "serial";
  todayDone: number;
  themes?: Theme[];                 // book
  volumesTotal?: number;            // serial
  current?: SerialCurrent;          // serial
  volumes?: number[];               // serial 各号の達成率(0-100)
}

// ── テスト結果ノート（type: test）────────
export interface TestNote {
  id: string;
  kind: "復習テスト" | "公開テスト";
  subject: SubjectName | "4科総合";
  name: string;
  date: string;                     // "6/21" など表示用
  range: string;
  score?: number;                   // 復習テスト
  deviation?: number;               // 公開テスト
  subjectDev?: Record<SubjectName, number>; // 公開テスト
  done: boolean;                    // 見直しずみ
}

// ── 間違いノート ─────────────────────────
export type MistakeCategory = "テキスト" | "復習テスト" | "公開テスト";
export interface MistakeNote {
  id: string;
  subject: SubjectName;
  unit: string;
  theme: string;
  category: MistakeCategory;
  source: string;
  reason: string;
  question: string;
  note: string;
  count: number;
  date: string;
  done: boolean;                    // 直しずみ
}

// ── 日々の報告ノート ─────────────────────
export interface PlanItem { subject: SubjectName; material: string; done: boolean; }
export interface ReportNote {
  date: string;                     // "2026-06-29"
  plan: PlanItem[];
  studyMinutes: Partial<Record<SubjectName, number>>;
  note: string;
}

// ── パイプライン出力（data.json）────────
export interface SubjectSummary {
  id: SubjectId; name: SubjectName; chart: string;
  progress: number; open: number; total: number;
}
export interface MaterialBreakdown {
  id: string; title: string; type: "book" | "serial";
  done: number; total: number; pct: number; sub: string; todayDone: number;
}
export interface SubjectStats {
  pct: number; doneQ: number; totalQ: number; remainQ: number;
  todayDone: number; materials: MaterialBreakdown[];
}
export interface CalendarDay { min: number | null; q: number; }
export interface CalendarPlanItem { subj: SubjectName; mat: string; color: string; }
export interface CalendarReport { done: boolean[]; note: string; }
export interface CalendarData {
  year: number; month: number; label: string; firstWeekday: number; today: number; goal: number;
  days: Record<number, CalendarDay>;
  monthBySubject: { name: SubjectName; min: number; q: number }[];
  plan: Record<number, CalendarPlanItem[]>;
  reports: Record<number, CalendarReport>;
}
export interface DashboardData {
  user: { name: string; grade: string; course: string };
  nextTest: { name: string; daysLeft: number };
  today: { progressPct: number; minutes: number; goalMinutes: number; reviewed: number; queued: number };
  streak: { current: number; best: number };
  calendar: CalendarData;
  history: number[];
  subjects: SubjectSummary[];
  categories: string[];
  texts: TextMaterial[];
  tests: TestNote[];
  reasons: string[];
  mistakes: MistakeNote[];
  stats: Record<SubjectId, SubjectStats>;   // 事前計算した科目別集計
}

export const SUBJECT_COLORS: Record<SubjectName, string> = {
  "算数": "var(--chart-7)",
  "国語": "var(--chart-2)",
  "理科": "var(--chart-1)",
  "社会": "#A9763C",
};
export const SUBJECT_IDS: Record<SubjectName, SubjectId> = {
  "算数": "math", "国語": "jp", "理科": "sci", "社会": "soc",
};
```

- [ ] **Step 3: コミット**

```bash
git add shared/
git commit -m "feat: shared frontmatter + data.json schema"
```

---

## Task 3: デザイントークン（shared/tokens.css）

READMEの Design Tokens を実体化する。正確なhexはプロトタイプに無いため、READMEで明示された値はそのまま、その他はアールヌーボー基調（アンティークゴールド + 生成り）の妥当値を定義する。実装中に見た目を screenshot で確認し微調整する。

**Files:**
- Create: `shared/tokens.css`

- [ ] **Step 1: shared/tokens.css を作成**

```css
:root {
  /* 科目カラー（README踏襲・必須） */
  --chart-7: #5b6ea8;   /* 算数: slate-blue */
  --chart-2: #BC6E4F;   /* 国語: テラコッタ */
  --chart-1: #5E8C88;   /* 理科: verdigris */
  /* 社会は #A9763C を直接指定 */

  /* 面・背景 */
  --canvas: #f7f3ea;
  --surface: #fffdf8;
  --surface-sunken: #efe9dc;

  /* テキスト3階調 */
  --ink: #2c2a26;
  --ink-soft: #6b6457;
  --ink-faint: #9a9182;

  /* 罫線 */
  --line: #e4dccb;
  --line-strong: #cdc2ab;

  /* アクセント（アンティークゴールド） */
  --gold: #b08d4f;
  --gold-deep: #8a6d35;
  --gold-veil: #f3ead4;

  /* 状態色 */
  --success: #5E8C88;
  --danger: #c0392b;

  /* 角丸 */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-pill: 999px;

  /* タイポ */
  --font-display: "Shippori Mincho", "Hiragino Mincho ProN", serif;
  --font-body: "Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", system-ui, sans-serif;

  /* モーション */
  --dur-fast: 160ms;
  --ease-organic: cubic-bezier(.2,.7,.2,1);
}

html, body { margin: 0; background: var(--canvas); color: var(--ink); font-family: var(--font-body); }
h1, h2, h3 { font-family: var(--font-display); color: var(--ink); margin: 0; }
.tnum { font-variant-numeric: tabular-nums; }
.eyebrow {
  font-family: var(--font-body); font-size: 11px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--ink-faint);
}
```

- [ ] **Step 2: フォントは Google Fonts を app の index.html で読み込む（Task 8で対応）。ここではコミットのみ**

```bash
git add shared/tokens.css
git commit -m "feat: design tokens reconstructed from README"
```

---

## Task 4: pipeline 初期化 + 正規化型

**Files:**
- Create: `pipeline/package.json`, `pipeline/tsconfig.json`, `pipeline/src/types.ts`, `pipeline/vitest.config.ts`

- [ ] **Step 1: pipeline/package.json を作成**

```json
{
  "name": "pipeline",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "build": "tsx src/build.ts",
    "watch": "tsx src/watch.ts",
    "test": "vitest run"
  },
  "dependencies": { "gray-matter": "^4.0.3", "glob": "^11.0.0", "chokidar": "^4.0.0", "shared": "workspace:*" },
  "devDependencies": { "tsx": "^4.19.0", "vitest": "^2.1.0", "typescript": "^5.6.0", "@types/node": "^22.0.0" }
}
```

- [ ] **Step 2: pipeline/tsconfig.json を作成**

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "strict": true, "esModuleInterop": true, "skipLibCheck": true, "types": ["node"]
  }
}
```

- [ ] **Step 3: pipeline/vitest.config.ts を作成**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
```

- [ ] **Step 4: 依存をインストール**

Run: `pnpm install`
Expected: 完了（lockfile生成）

- [ ] **Step 5: コミット**

```bash
git add pipeline/package.json pipeline/tsconfig.json pipeline/vitest.config.ts pnpm-lock.yaml
git commit -m "chore: init pipeline package"
```

---

## Task 5: 集計ロジック（pipeline/src/aggregate.ts）— TDD

`data.js` の `subjectStats` とカレンダー生成IIFEを移植する。これがPhase 1の心臓部なのでテスト必須。

**Files:**
- Create: `pipeline/src/aggregate.ts`, `pipeline/test/aggregate.test.ts`

- [ ] **Step 1: 失敗するテストを書く（subjectStats: book）**

`pipeline/test/aggregate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { subjectStats, buildCalendar } from "../src/aggregate.js";
import type { TextMaterial } from "shared";

const book: TextMaterial = {
  id: "ma-plus1", subject: "算数", title: "プラスワン問題集", publisher: "東京出版",
  materialType: "book", todayDone: 8,
  themes: [
    { name: "和差算", total: 10, done: 10 },
    { name: "つるかめ算", total: 12, done: 6 },
  ],
};

describe("subjectStats", () => {
  it("book はテーマの done/total を合計し pct を出す", () => {
    const s = subjectStats("算数", [book]);
    expect(s.doneQ).toBe(16);
    expect(s.totalQ).toBe(22);
    expect(s.pct).toBe(73); // round(16/22*100)
    expect(s.todayDone).toBe(8);
    expect(s.materials[0].sub).toBe("1/2テーマ");
  });

  it("serial は号の達成率を問数換算する", () => {
    const serial: TextMaterial = {
      id: "ma-hibi", subject: "算数", title: "日々の演習", publisher: "月刊",
      materialType: "serial", todayDone: 6, volumesTotal: 3,
      current: { label: "6月号", unit: "速さ", total: 32, done: 20 },
      volumes: [100, 100, 50],
    };
    const s = subjectStats("算数", [serial]);
    // total = 3*32 = 96, done = round((100+100+50)/100*32) = round(80) = 80
    expect(s.totalQ).toBe(96);
    expect(s.doneQ).toBe(80);
    expect(s.materials[0].sub).toBe("2/3冊"); // v>=100 が2件
  });
});

describe("buildCalendar", () => {
  it("曜日テンプレから当月の plan を生成し過去日を報告ずみにする", () => {
    const cal = buildCalendar({
      year: 2026, month: 6, label: "2026年 6月", firstWeekday: 1, today: 29, goal: 120,
      days: {}, monthBySubject: [],
    });
    expect(Object.keys(cal.plan).length).toBe(30); // 6月は30日
    expect(cal.reports[1]).toBeDefined();           // 過去日は報告ずみ
    expect(cal.reports[29]).toBeUndefined();         // 今日は未報告
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pnpm --filter pipeline test`
Expected: FAIL（aggregate.ts が無い / 関数未定義）

- [ ] **Step 3: aggregate.ts を実装**

`data.js` の `window.subjectStats` と末尾IIFEを移植。引数で教材配列・カレンダーを受ける形に変更。

```ts
import {
  SUBJECT_COLORS, SUBJECT_IDS,
  type SubjectName, type TextMaterial, type SubjectStats,
  type MaterialBreakdown, type CalendarData,
} from "shared";

export function subjectStats(subjectName: SubjectName, texts: TextMaterial[]): SubjectStats {
  const mats = texts.filter((t) => t.subject === subjectName);
  let doneQ = 0, totalQ = 0;
  const materials: MaterialBreakdown[] = mats.map((mat) => {
    let d: number, t: number, sub: string;
    if (mat.materialType === "serial" && mat.current && mat.volumes && mat.volumesTotal) {
      const per = mat.current.total;
      t = mat.volumesTotal * per;
      d = Math.round(mat.volumes.reduce((a, v) => a + v, 0) / 100 * per);
      const doneVols = mat.volumes.filter((v) => v >= 100).length;
      sub = `${doneVols}/${mat.volumesTotal}冊`;
    } else {
      const themes = mat.themes ?? [];
      t = themes.reduce((a, x) => a + x.total, 0);
      d = themes.reduce((a, x) => a + x.done, 0);
      const doneT = themes.filter((x) => x.done >= x.total).length;
      sub = `${doneT}/${themes.length}テーマ`;
    }
    doneQ += d; totalQ += t;
    const pct = t ? Math.round((d / t) * 100) : 0;
    return { id: mat.id, title: mat.title, type: mat.materialType, done: d, total: t, pct, sub, todayDone: mat.todayDone };
  });
  return {
    pct: totalQ ? Math.round((doneQ / totalQ) * 100) : 0,
    doneQ, totalQ, remainQ: totalQ - doneQ,
    todayDone: mats.reduce((a, m) => a + (m.todayDone || 0), 0),
    materials,
  };
}

type CalendarSeed = Omit<CalendarData, "plan" | "reports">;

export function buildCalendar(cal: CalendarSeed): CalendarData {
  const color = (name: SubjectName) => SUBJECT_COLORS[name] ?? "var(--ink-faint)";
  const tmpl: Record<number, [SubjectName, string][]> = {
    0: [["算数", "プラスワン"], ["理科", "メモリーチェック"]],
    1: [["国語", "漢字の要"], ["算数", "日々の演習"]],
    2: [["社会", "コアプラス"], ["算数", "プラスワン"]],
    3: [["理科", "メモリーチェック"], ["国語", "漢字の要"]],
    4: [["算数", "プラスワン"], ["社会", "Z会"]],
    5: [["算数", "日々の演習"], ["国語", "漢字の要"], ["理科", "メモリーチェック"]],
    6: [],
  };
  const daysInMonth = new Date(cal.year, cal.month, 0).getDate();
  const plan: CalendarData["plan"] = {};
  const reports: CalendarData["reports"] = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const idx = (d - 1 + ((cal.firstWeekday + 6) % 7)) % 7;
    const items = (tmpl[idx] ?? []).map((it) => ({ subj: it[0], mat: it[1], color: color(it[0]) }));
    plan[d] = items;
    if (d < cal.today && items.length && d !== cal.today - 1) {
      reports[d] = { done: items.map(() => true), note: "" };
    }
  }
  return { ...cal, plan, reports };
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `pnpm --filter pipeline test`
Expected: PASS（全テスト緑）

- [ ] **Step 5: コミット**

```bash
git add pipeline/src/aggregate.ts pipeline/test/aggregate.test.ts
git commit -m "feat: port subjectStats and calendar generation with tests"
```

---

## Task 6: vault サンプルノート作成

READMEのfrontmatterスキーマに沿って、`data.js` のモック内容を実ノート化する。最低限、各種別を網羅する数件を作る。

**Files:**
- Create: `vault/教材/プラスワン問題集.md`, `vault/教材/日々の演習.md`, `vault/教材/漢字の要.md`, `vault/教材/メモリーチェック理科.md`, `vault/教材/コアプラス社会.md`, `vault/教材/計算の特訓.md`（修了済み例）, `vault/テスト/2026-06-21-復習18-算数.md`, `vault/テスト/2026-06-08-公開6月.md`, `vault/間違い/2026-06-24-速さ-追い越し.md`, `vault/報告/2026-06-29.md`

- [ ] **Step 1: 教材ノート（book）を作成**

`vault/教材/プラスワン問題集.md`:

```markdown
---
type: text
subject: 算数
title: プラスワン問題集
publisher: 東京出版
material_type: book
today_done: 8
themes:
  - { name: 和差算・分配算, total: 10, done: 10 }
  - { name: つるかめ算, total: 12, done: 12 }
  - { name: 過不足算, total: 10, done: 8 }
  - { name: 差集め算, total: 12, done: 6 }
  - { name: 平均算, total: 8, done: 8 }
  - { name: 消去算, total: 10, done: 4 }
  - { name: 年齢算, total: 8, done: 0 }
  - { name: 速さの基本, total: 14, done: 0 }
---
速さが難しい。
```

- [ ] **Step 2: 教材ノート（serial）を作成**

`vault/教材/日々の演習.md`:

```markdown
---
type: text
subject: 算数
title: 日々の演習
publisher: 中学への算数（月刊）
material_type: serial
today_done: 6
volumes_total: 30
current: { label: 6月号, unit: 速さと比, total: 32, done: 20 }
volumes: [100,100,100,100,100,100,100,100,100,100,100,62,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
---
```

- [ ] **Step 3: 残りの教材ノートを `data.js` の texts に合わせて作成**

`漢字の要`(国語/book)、`メモリーチェック理科`(理科/book)、`コアプラス社会`(社会/book)、修了済み例として `計算の特訓`(算数/book・全テーマ done=total) を Step 1 と同形式で作成。各 frontmatter の値は `ui_kits/kurumi-dashboard/data.js` の対応エントリを写す。

- [ ] **Step 4: テスト結果ノートを作成**

`vault/テスト/2026-06-21-復習18-算数.md`:

```markdown
---
type: test
kind: 復習テスト
subject: 算数
name: 第18回 復習テスト
date: 6/21
range: 速さ・旅人算
score: 82
reviewed: true
---
```

`vault/テスト/2026-06-08-公開6月.md`:

```markdown
---
type: test
kind: 公開テスト
subject: 4科総合
name: 6月度 公開テスト
date: 6/8
range: 5年 上 全範囲
deviation: 58
subject_dev: { 算数: 55, 国語: 60, 理科: 57, 社会: 61 }
reviewed: true
---
```

- [ ] **Step 5: 間違いノートを作成**

`vault/間違い/2026-06-24-速さ-追い越し.md`:

```markdown
---
subject: 算数
unit: 速さ
theme: 追い越し
category: テキスト
source: 速さテキスト p.32
reason: 考え方のミス
question: 兄が弟を追い越すのにかかる時間
count: 3
date: 6/24
solved: false
---
追い越しは『差÷速さの差』。和で割ってしまった。
```

- [ ] **Step 6: 日々の報告ノートを作成**

`vault/報告/2026-06-29.md`:

```markdown
---
date: 2026-06-29
plan:
  - { subject: 算数, material: プラスワン, done: true }
  - { subject: 理科, material: メモリーチェック, done: false }
study_minutes:
  算数: 60
  理科: 24
---
今日はプラスワンの速さが難しかった。
```

- [ ] **Step 7: コミット**

```bash
git add vault/
git commit -m "feat: sample Obsidian vault notes"
```

---

## Task 7: パーサ + ビルド（pipeline/src/parse.ts, build.ts, watch.ts）— TDD

**Files:**
- Create: `pipeline/src/parse.ts`, `pipeline/src/build.ts`, `pipeline/src/watch.ts`, `pipeline/test/parse.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`pipeline/test/parse.test.ts`:

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
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pnpm --filter pipeline test parse`
Expected: FAIL（parse.ts が無い）

- [ ] **Step 3: parse.ts を実装**

フォルダ名で種別を判定し（`教材/`→text, `テスト/`→test, `間違い/`→mistake, `報告/`→report）、gray-matterでfrontmatterを読み、snake_case→camelCaseへ正規化。id はファイル名（拡張子なし）を既定にする。

```ts
import { glob } from "glob";
import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  TextMaterial, TestNote, MistakeNote, ReportNote, SubjectName,
} from "shared";

export interface ParsedVault {
  texts: TextMaterial[]; tests: TestNote[]; mistakes: MistakeNote[]; reports: ReportNote[];
}

function category(file: string): "text" | "test" | "mistake" | "report" | null {
  if (file.includes("/教材/")) return "text";
  if (file.includes("/テスト/")) return "test";
  if (file.includes("/間違い/")) return "mistake";
  if (file.includes("/報告/")) return "report";
  return null;
}

export async function parseVault(vaultDir: string): Promise<ParsedVault> {
  const files = await glob("**/*.md", { cwd: vaultDir, absolute: true });
  const out: ParsedVault = { texts: [], tests: [], mistakes: [], reports: [] };
  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const fm = matter(raw).data as Record<string, unknown>;
    const id = path.basename(file, ".md");
    const norm = file.split(path.sep).join("/");
    switch (category(norm)) {
      case "text": out.texts.push({
        id, subject: fm.subject as SubjectName, title: fm.title as string,
        publisher: fm.publisher as string, materialType: fm.material_type as "book" | "serial",
        todayDone: (fm.today_done as number) ?? 0,
        themes: fm.themes as TextMaterial["themes"],
        volumesTotal: fm.volumes_total as number | undefined,
        current: fm.current as TextMaterial["current"],
        volumes: fm.volumes as number[] | undefined,
      }); break;
      case "test": out.tests.push({
        id, kind: fm.kind as TestNote["kind"], subject: fm.subject as TestNote["subject"],
        name: fm.name as string, date: String(fm.date), range: fm.range as string,
        score: fm.score as number | undefined, deviation: fm.deviation as number | undefined,
        subjectDev: fm.subject_dev as TestNote["subjectDev"], done: Boolean(fm.reviewed),
      }); break;
      case "mistake": out.mistakes.push({
        id, subject: fm.subject as SubjectName, unit: fm.unit as string, theme: fm.theme as string,
        category: fm.category as MistakeNote["category"], source: fm.source as string,
        reason: fm.reason as string, question: fm.question as string,
        note: matter(raw).content.trim(), count: (fm.count as number) ?? 1,
        date: String(fm.date), done: Boolean(fm.solved),
      }); break;
      case "report": out.reports.push({
        date: String(fm.date), plan: (fm.plan as ReportNote["plan"]) ?? [],
        studyMinutes: (fm.study_minutes as ReportNote["studyMinutes"]) ?? {},
        note: matter(raw).content.trim(),
      }); break;
    }
  }
  return out;
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `pnpm --filter pipeline test parse`
Expected: PASS

- [ ] **Step 5: build.ts を実装（parse → aggregate → data.json）**

報告の `study_minutes` を月内合算して `calendar.monthBySubject` の min を作り、`days` は報告日から min を埋める。Phase 1 では未報告日や history は `data.js` の値を初期シードとして利用してよい（実データが揃うまでの暫定）。

```ts
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseVault } from "./parse.js";
import { subjectStats, buildCalendar } from "./aggregate.js";
import {
  SUBJECT_COLORS, SUBJECT_IDS,
  type DashboardData, type SubjectName, type SubjectId, type SubjectStats,
} from "shared";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VAULT = path.join(ROOT, "vault");
const OUT = path.join(ROOT, "app-dashboard/public/data.json");

export async function build(): Promise<DashboardData> {
  const v = await parseVault(VAULT);
  const names: SubjectName[] = ["算数", "国語", "理科", "社会"];

  const stats = {} as Record<SubjectId, SubjectStats>;
  const subjects = names.map((name) => {
    const s = subjectStats(name, v.texts);
    stats[SUBJECT_IDS[name]] = s;
    const open = v.texts.filter((t) => t.subject === name && s.materials.find((m) => m.id === t.id && m.pct < 100)).length;
    return { id: SUBJECT_IDS[name], name, chart: SUBJECT_COLORS[name], progress: s.pct, open, total: s.totalQ };
  });

  // 報告から学習時間を月内合算
  const minBySubject: Record<string, number> = {};
  for (const r of v.reports)
    for (const [subj, min] of Object.entries(r.studyMinutes)) minBySubject[subj] = (minBySubject[subj] ?? 0) + (min ?? 0);
  const monthBySubject = names.map((name) => ({ name, min: minBySubject[name] ?? 0, q: 0 }));

  const calendar = buildCalendar({
    year: 2026, month: 6, label: "2026年 6月", firstWeekday: 1, today: 29, goal: 120,
    days: {}, monthBySubject,
  });

  const data: DashboardData = {
    user: { name: "くるみ", grade: "小学5年生", course: "中学受験コース" },
    nextTest: { name: "7月度 公開テスト", daysLeft: 9 },
    today: { progressPct: 72, minutes: 84, goalMinutes: 120, reviewed: v.mistakes.filter((m) => m.done).length, queued: v.mistakes.filter((m) => !m.done).length },
    streak: { current: 9, best: 18 },
    calendar, history: [50,70,30,0,90,110,60,80,20,75,100,55,120,84],
    subjects, categories: ["テキスト", "復習テスト", "公開テスト"],
    texts: v.texts, tests: v.tests,
    reasons: ["計算ミス","問題の読みまちがい","おぼえていない","考え方のミス","時間切れ","うっかりミス"],
    mistakes: v.mistakes.map((m, i) => ({ ...m, id: m.id || String(i + 1) })),
    stats,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 2), "utf8");
  return data;
}

build().then(() => console.log("data.json written:", OUT));
```

- [ ] **Step 6: build を実行して data.json を生成**

Run: `pnpm --filter pipeline build`
Expected: `data.json written: .../app-dashboard/public/data.json`、ファイルが生成される

- [ ] **Step 7: watch.ts を実装**

```ts
import chokidar from "chokidar";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./build.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VAULT = path.join(ROOT, "vault");

console.log("watching", VAULT);
chokidar.watch(VAULT, { ignoreInitial: false }).on("all", async () => {
  try { await build(); console.log("rebuilt", new Date().toLocaleTimeString()); }
  catch (e) { console.error(e); }
});
```

build.ts の末尾 `build().then(...)` は watch から import すると二重実行になるため、`build.ts` を「export関数のみ + import.meta が直接実行のときだけ走らせる」形に変更:

```ts
if (import.meta.url === `file://${process.argv[1]}`) build().then(() => console.log("data.json written:", OUT));
```

- [ ] **Step 8: コミット**

```bash
git add pipeline/src/parse.ts pipeline/src/build.ts pipeline/src/watch.ts pipeline/test/parse.test.ts
git commit -m "feat: vault parser, data.json build, and watch mode"
```

---

## Task 8: app-dashboard 初期化 + データ読込

**Files:**
- Create: `app-dashboard/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/data.ts`, `src/App.tsx`

- [ ] **Step 1: app-dashboard/package.json を作成**

```json
{
  "name": "app-dashboard",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc && vite build", "preview": "vite preview" },
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1", "lucide-react": "^0.456.0", "shared": "workspace:*" },
  "devDependencies": { "@vitejs/plugin-react": "^4.3.0", "vite": "^5.4.0", "typescript": "^5.6.0", "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0" }
}
```

- [ ] **Step 2: vite.config.ts / tsconfig.json を作成**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });
```
`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020", "lib": ["ES2020","DOM","DOM.Iterable"], "module": "ESNext",
    "moduleResolution": "Bundler", "jsx": "react-jsx", "strict": true,
    "esModuleInterop": true, "skipLibCheck": true, "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: index.html を作成（フォント + トークン読込）**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>くるみさん — 学習進捗ダッシュボード</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: main.tsx を作成（トークンCSSを import）**

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import "shared/tokens.css";
import { App } from "./App";
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
```

- [ ] **Step 5: data.ts を作成（data.json を fetch）**

```ts
import type { DashboardData } from "shared";
export async function loadData(): Promise<DashboardData> {
  const res = await fetch("/data.json");
  if (!res.ok) throw new Error("data.json not found — run `pnpm build:data`");
  return res.json();
}
```

- [ ] **Step 6: 最小 App.tsx で読込確認**

```tsx
import { useEffect, useState } from "react";
import type { DashboardData } from "shared";
import { loadData } from "./data";
export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => { loadData().then(setData); }, []);
  if (!data) return <div style={{ padding: 40 }}>読み込み中…</div>;
  return <pre>{JSON.stringify(data.subjects, null, 2)}</pre>;
}
```

- [ ] **Step 7: 依存インストール → dev 起動確認**

Run: `pnpm install && pnpm --filter pipeline build && pnpm --filter app-dashboard dev`
Expected: ブラウザで subjects のJSONが表示される（data.json が読めている）

- [ ] **Step 8: コミット**

```bash
git add app-dashboard/
git commit -m "feat: scaffold dashboard app and data loading"
```

---

## Task 9: UIプリミティブ + chrome 再構築

欠落しているデザインシステムを再構築する。プロトタイプの `Chrome.jsx` と各JSXのインラインstyleを移植元にする。

**Files:**
- Create: `app-dashboard/src/ui/Icon.tsx`, `Button.tsx`, `Badge.tsx`, `Card.tsx`, `ProgressBar.tsx`, `SideNav.tsx`, `Pill.tsx`
- Create: `app-dashboard/src/chrome/Wordmark.tsx`, `TopBar.tsx`, `SectionTitle.tsx`, `HistoryStrip.tsx`

- [ ] **Step 1: Icon を lucide-react で作成**

```tsx
import { icons } from "lucide-react";
export function Icon({ name, size = 18, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  const key = name.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
  const C = (icons as Record<string, React.FC<{ size?: number; color?: string }>>)[key];
  return C ? <C size={size} color={color} /> : null;
}
```

- [ ] **Step 2: chrome を移植**

`Wordmark.tsx` / `TopBar.tsx` / `SectionTitle.tsx` / `HistoryStrip.tsx` を `ui_kits/kurumi-dashboard/Chrome.jsx` から移植。インラインstyleはそのまま、`<i data-lucide>` は `<Icon>` に置換、`window.lucide.createIcons()` 依存は削除（lucide-react は不要）。

- [ ] **Step 3: 汎用UI（Button/Badge/Card/ProgressBar/SideNav/Pill）を作成**

各JSXでの使われ方（`App.jsx` の `SideNav`/`Button`/`Badge`、各画面の進捗バー・カード・ピル）に合わせて、READMEトークンを使ったプリミティブを作る。propsは利用箇所から逆算（例: `Badge` は `children`+`tone`、`ProgressBar` は `value`(0-100)+`color`）。

- [ ] **Step 4: コミット**

```bash
git add app-dashboard/src/ui app-dashboard/src/chrome
git commit -m "feat: reconstruct UI primitives and chrome from prototype"
```

---

## Task 10: App シェル（サイドバー + ルーター + 科目進捗）

**Files:**
- Modify: `app-dashboard/src/App.tsx`
- Create: `app-dashboard/src/Sidebar.tsx`

- [ ] **Step 1: App.tsx を `ui_kits/kurumi-dashboard/App.jsx` から移植**

`page`/`matSubject` state、NAV/TITLES、`go()`、サイドバー（Wordmark + ナビ + 科目進捗 + ユーザー情報）、TopBar、画面ルーティングを再現。`window.MOCK`→`data`、`window.subjectStats`→`data.stats[id]` に置換。lucide再生成effectは削除。

- [ ] **Step 2: dev で確認**

Run: `pnpm --filter app-dashboard dev`
Expected: サイドバー＋空メイン領域が表示、ナビ切替でページstateが変わる

- [ ] **Step 3: コミット**

```bash
git add app-dashboard/src/App.tsx app-dashboard/src/Sidebar.tsx
git commit -m "feat: app shell with sidebar router and subject progress"
```

---

## Task 11: ダッシュボード画面

**Files:**
- Create: `app-dashboard/src/screens/Dashboard.tsx`

- [ ] **Step 1: `DashboardScreen.jsx` を移植**

上段（本日の進捗リング 左300px固定 + ミニ学習カレンダー 右fill）、下段の科目カードグリッド（`repeat(auto-fill, minmax(340px,1fr))` gap16）。科目カードは取り組み中の参考書を並列進捗バーで列挙、完了本はチップ折りたたみ、ヘッダーに合計%は出さない。データは `data.stats[subjectId]` から。

- [ ] **Step 2: screenshot で確認しトークン微調整**

Run: dev起動 → ブラウザ確認。プロトタイプ（`index.html` を別途開いた図 or README記述）と配色・余白を比較し、`shared/tokens.css` を調整。

- [ ] **Step 3: コミット**

```bash
git add app-dashboard/src/screens/Dashboard.tsx shared/tokens.css
git commit -m "feat: dashboard screen"
```

---

## Task 12: 間違い直し画面（+ 追加フォーム）

**Files:**
- Create: `app-dashboard/src/screens/Mistakes.tsx`, `app-dashboard/src/screens/AddMistake.tsx`

- [ ] **Step 1: `MistakesScreen.jsx` を移植**

科目フィルタ（全/算/国/理/社のピル）+ 一覧 + 詳細パネル。各行: 科目色ドット・タイトル・出典・回数・日付・「直しずみ/直す」。詳細に単元/テーマ/カテゴリのバッジ・理由・メモ。データは `data.mistakes`。

- [ ] **Step 2: `AddMistakeScreen.jsx` を移植（ローカル表示のみ）**

カテゴリ選択→科目・単元・テーマ・出典・理由・メモ・写真2枠。**送信はローカルstateのみ**（実書込はPhase 2 / Claude Code）。「保存」押下時は確認トーストを出して一覧へ戻る程度。

- [ ] **Step 3: dev確認 → コミット**

```bash
git add app-dashboard/src/screens/Mistakes.tsx app-dashboard/src/screens/AddMistake.tsx
git commit -m "feat: mistakes list, detail, and add form (local-only)"
```

---

## Task 13: テキスト・テスト画面

**Files:**
- Create: `app-dashboard/src/screens/Materials.tsx`

- [ ] **Step 1: `MaterialsScreen.jsx` を移植**

カテゴリタブ（テキスト/復習テスト/公開テスト）+ 科目ピル。テキスト: 科目見出し→取り組み中教材カード（`minmax(420px,1fr)`）、修了本は「解き終えた参考書 N冊」で折りたたみ（既定閉）。bookカード: 全体%・全テーマ/問数・残り問数・今日の進み・テーマ別進捗バー、完了テーマは「完了したテーマ N件」で折りたたみ。serialカード: 今月号・全30冊棒グラフ・全体%。テスト: 復習=得点、公開=偏差値（科目ピルで科目別切替、4科総合常時表示）。データは `data.texts`/`data.tests`/`data.stats`。`matSubject` で初期フィルタ。

- [ ] **Step 2: dev確認 → コミット**

```bash
git add app-dashboard/src/screens/Materials.tsx
git commit -m "feat: materials and tests screen"
```

---

## Task 14: 学習カレンダー画面 + StudyCalendar

**Files:**
- Create: `app-dashboard/src/StudyCalendar.tsx`, `app-dashboard/src/screens/Calendar.tsx`

- [ ] **Step 1: `StudyCalendar.jsx` を移植**

`variant="full"` の月グリッド。各日に科目色ドット+教材名、日曜お休み、今日は金枠、報告ずみ✓、4科カラー凡例。ミニ版（ダッシュボード用）も同コンポーネントの variant で対応。データは `data.calendar.plan`/`reports`/`days`。

- [ ] **Step 2: `CalendarScreen.jsx` を移植**

スリムタイル3つ（連続学習・今月報告した日・今日の予定件数）→ 日々の報告カード（今日/昨日タブ・チェックリスト・メモ・「報告する」→受領表示。**送信はローカルstateのみ**）→ 月間予定カレンダー → 学習バランス（SubjectSplit: ドーナツ+横棒、時間ベース「N時間N分」、合計を中央）。データは `data.calendar.monthBySubject`（時間）/`streak`。

- [ ] **Step 3: dev確認 → コミット**

```bash
git add app-dashboard/src/StudyCalendar.tsx app-dashboard/src/screens/Calendar.tsx
git commit -m "feat: study calendar screen and component"
```

---

## Task 15: 仕上げ・全画面通し確認

- [ ] **Step 1: 全画面を dev で通し確認**

Run: `pnpm --filter pipeline build && pnpm --filter app-dashboard dev`
4画面を巡回し、ナビ遷移・フィルタ・折りたたみ・科目クリック→materials絞り込みが動くことを確認。

- [ ] **Step 2: watch モードの動作確認**

Run: `pnpm --filter pipeline watch`（別ターミナル）。`vault/教材/プラスワン問題集.md` の done を1つ増やして保存 → data.json 再生成 → ブラウザ再読込で数値が変わることを確認。

- [ ] **Step 3: README（開発者向け）を追加**

`README.md`（ルート）に: 構成・`pnpm install`・`pnpm build:data`・`pnpm dev`・`pnpm watch:data` の手順、vault編集→反映フローを記載。

- [ ] **Step 4: 最終コミット**

```bash
git add README.md
git commit -m "docs: developer setup and run instructions"
```

---

## Self-Review メモ

- **スコープ網羅**: spec §5(pipeline)/§6(tokens)/§7(screens)/§9(実装順) を Task 1–15 でカバー。報告書込（spec Phase 2）は本計画外。
- **型整合**: `subjectStats`/`buildCalendar`/`parseVault`/`build`/`DashboardData`/`SubjectStats` の名前と形を Task 2/5/7 間で統一済み。
- **暫定値の注意**: `today.progressPct`・`history`・カレンダー `days` は実データが揃うまで `data.js` のシード値を使用（build.ts内）。実報告が増えたら段階的に実データ化する（Phase 1.5）。
- **見た目の正解**: tokens の hex は README に無い分を妥当値で置いたため、各画面タスクで screenshot 比較し微調整する前提。
```
