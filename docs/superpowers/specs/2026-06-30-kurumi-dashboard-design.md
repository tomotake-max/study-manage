# くるみ 学習ダッシュボード — 設計ドキュメント

作成日: 2026-06-30

## 1. 目的

小学生（中学受験）の学習進捗を、本人・保護者が一目で確認できるダッシュボード。
対象は **算数・国語・理科・社会の4科のみ**。データは Obsidian 保管庫（Markdownノート）に
入力 → パイプラインで吸い上げ → ダッシュボードに表示、という構成。

見た目は `ui_kits/kurumi-dashboard/` のプロトタイプ（High-fidelity）を正解として忠実に再現する。

## 2. 確定した方針

| 項目 | 決定 |
|---|---|
| フレームワーク | Vite + React + TypeScript（ダッシュボードは静的SPA） |
| デザインシステム | プロトタイプに同梱されていない（`styles.css` / `_ds_bundle.js` が欠落）。READMEのDesign Tokens記載 + JSX内インラインstyleから**再構築**する |
| 入力（書き込み） | ダッシュボードとは**別アプリ**（ローカル専用）として分離 |
| 音声入力 | 既存の **Aqua Voice** を利用（OSレベルで任意のテキスト欄に文字起こし）。STT実装・料金は不要 |
| 入力の構造化LLM | **Claude API（claude-haiku-4-5）** |
| 報告の保存（Phase 1） | アプリは読取専用。報告は Claude Code 経由で `vault/報告/*.md` を更新 |
| Obsidian保管庫 | `StudyBoard/` 直下に新規作成。READMEスキーマに沿ったサンプルノートを用意 |

## 3. ディレクトリ構成

```
StudyBoard/
├─ vault/                    Obsidian保管庫（両アプリが参照する唯一の真実）
│   ├─ 教材/                 type: text の教材ノート（book / serial）
│   ├─ テスト/               type: test（復習テスト / 公開テスト）
│   ├─ 間違い/               間違いノート（本文に写真添付）
│   └─ 報告/                 日々の報告ノート
├─ shared/                   両アプリ共有
│   ├─ schema.ts             frontmatter の型定義
│   ├─ tokens.css            再構築したデザイントークン
│   └─ ui/                   再構築UIプリミティブ（SideNav/Button/Badge/Card等）
├─ pipeline/                 vault → data.json（読取系）
│   ├─ src/parse.ts          gray-matter + glob で .md 走査
│   ├─ src/aggregate.ts      data.js の subjectStats / カレンダー生成を移植
│   └─ src/watch.ts          chokidar 監視 → data.json 再生成
├─ app-dashboard/            読取専用ビューア（Vite + React + TS / 静的）
│   ├─ src/screens/          Dashboard / Mistakes / AddMistake / Materials / Calendar
│   ├─ src/StudyCalendar.tsx
│   └─ public/data.json      パイプライン出力（fetchで読む）
└─ app-input/                ローカル入力ツール（Phase 2）
    自由文 → Claude APIで構造化 → 確認(OK/NG/修正) → vault/ に .md 書き出し
```

## 4. データフロー

```
vault/*.md  ──(pipeline: parse → aggregate)──>  data.json  ──(fetch)──>  app-dashboard
   ▲
   └──(app-input: 自由文 → Claude haiku 構造化 → 確認 → 書込)──  ※Phase 2
```

- 生データ（done/total・予定・報告・点数）は vault から。
- 派生値（%・残り問数・冊数・カレンダーの plan/reports）は pipeline で計算。
- `shared/schema.ts` を pipeline と両アプリで共有し、frontmatter の型を一元化。

## 5. パイプライン（pipeline/）

- **パーサ**: `gray-matter` で frontmatter を、`glob` で `vault/**/*.md` を走査。
- **集計**: `data.js` の以下をTypeScriptへ移植する（ロジックはほぼそのまま）。
  - `subjectStats(subjectName)` — book はテーマ done/total 合計、serial は号の達成率を問数換算。
  - 末尾IIFE — 曜日テンプレートから当月の `plan` を生成、過去予定日を `reports` 済み扱い。
- **出力**: `app-dashboard/public/data.json`。
- **実行**: 開発時は `chokidar` で `vault/` を監視しホットリロード。本番はGit同期→CIで生成→再デプロイ、を想定（MVPでは手動 build で可）。

## 6. デザインシステム再構築（shared/）

プロトタイプの `styles.css` / `_ds_bundle.js`（`window.AtelierMuchaDesignSystem_29c0c4`）が
欠落しているため、以下を新規作成する。

- **tokens.css**: READMEのDesign Tokens記載を実体化。
  - 科目カラー（踏襲必須）: 算数=`--chart-7`(青系) / 国語=`#BC6E4F`(テラコッタ) /
    理科=`#5E8C88`(緑) / 社会=`#A9763C`(ブロンズ)。
  - 中立色 `--ink`/`--ink-soft`/`--ink-faint`、面 `--surface`/`--surface-sunken`、
    罫線 `--line`/`--line-strong`、アクセント `--gold`系、`--success`。
  - 角丸 `--radius-sm/md/pill`、タイポ `--font-display`/`--font-body`、`.tnum`、`--dur-fast`。
- **ui/**: JSXが使う `SideNav` / `Button` / `Badge` と、画面で多用するカード/進捗バー等の
  プリミティブを、プロトタイプのインラインstyleを参照して再現。
- アイコンは lucide-react に置換（プロトタイプは lucide UMD + 毎レンダー再生成）。

## 7. 画面（app-dashboard/）

左サイドバー＋メイン2カラム。ナビ4つ: ダッシュボード / 間違い直し / テキスト・テスト / 学習カレンダー。
サイドバー下部に「科目の進捗」（参考書到達度バー）＋ユーザー情報。
各画面の詳細仕様はプロトタイプREADME（`design_handoff_kurumi_dashboard/README.md`）の
「Screens / Views」に従う。要点のみ:

1. **ダッシュボード**: 上段=本日の進捗リング(左300px固定)＋ミニ学習カレンダー(右fill)、
   下段=科目カードグリッド。科目カードは取り組み中の参考書を並列の進捗バーで列挙、
   完了本はチップ折りたたみ。**ヘッダーに合計%は出さない**。
2. **間違い直し**: 科目フィルタ＋一覧＋詳細パネル。追加フォームはローカル表示のみ
   （実書込はPhase 2のapp-input、もしくはClaude Code経由）。
3. **テキスト・テスト**: カテゴリタブ＋科目ピル。book/serialカード、完了テーマ/修了本は折りたたみ。
   テストは復習=得点、公開=偏差値（科目別切替）。
4. **学習カレンダー**: スリムタイル3つ→日々の報告→月間予定カレンダー(科目色ドット＋教材名)→
   学習バランス(時間ベースのドーナツ＋横棒)。報告送信はローカル受領表示のみ。

## 8. フェーズ

| | 内容 | LLM料金 | 手間 |
|---|---|---|---|
| **Phase 1（MVP）** | vaultサンプル + pipeline + app-dashboard（読取専用） | ゼロ | 小 |
| **Phase 2** | app-input（Aqua Voice想定の自由文 → Claude haiku構造化 → 確認 → 書込） | 1記入 数円程度 | 中 |

Phase 1 を先に完成させる。schema は Phase 1 から双方向（読み書き可能な形）で用意し、
Phase 2 で書込・集計を再利用する。

## 9. 実装順序（ユーザー指定）

1. Obsidian frontmatterスキーマ確定（READMEのYAML案ベース、サンプルノートを数件作成）
2. パーサ作成（gray-matter + glob で .md → data.json、chokidar監視）。
   `data.js` の `subjectStats` とカレンダー生成を移植。
3. UIを data.json に繋いで実装（プロトタイプの見た目を正解として再現）

（Phase 2 の app-input はこの後）

## 10. スコープ外（YAGNI）

- 学習量ヒートマップ・毎日の学習時間棒グラフ（READMEで廃止済み）。
- ダッシュボードからの書込API（読取専用に固定。書込はapp-input/Claude Codeに分離）。
- 認証・複数ユーザー（1人運用前提）。
