# くるみ 学習ダッシュボード

小学生（中学受験）の学習進捗ダッシュボード。Obsidian保管庫（Markdownノート）に入力したデータを
パイプラインで集計し、React製ダッシュボード（読取専用）に表示する。対象は **算数・国語・理科・社会** の4科。

設計の経緯は [`docs/superpowers/specs/`](docs/superpowers/specs/)、実装計画は
[`docs/superpowers/plans/`](docs/superpowers/plans/) を参照。

## 構成（pnpm workspace）

```
vault/           Obsidian保管庫（教材/ テスト/ 間違い/ 報告/ のMarkdownノート）
shared/          共有: schema.ts（frontmatter/出力の型）+ tokens.css（デザイントークン）
pipeline/        vault/*.md → app-dashboard/public/data.json を生成（gray-matter + glob）
app-dashboard/   Vite + React + TS のダッシュボード（読取専用・data.json を fetch）
```

データの流れ: `vault/*.md` →（pipeline: パース→集計）→ `data.json` →（fetch）→ ダッシュボード。

## セットアップ

```bash
corepack enable          # pnpm を有効化（初回のみ）
pnpm install
```

## 使い方

```bash
pnpm build:data          # vault を読んで data.json を生成
pnpm dev                 # ダッシュボードを起動（http://localhost:5173）
pnpm watch:data          # vault を監視して data.json を自動再生成（別ターミナル）
```

開発フロー: `pnpm watch:data` と `pnpm dev` を両方立ち上げておくと、`vault/` の `.md` を
編集・保存するたびに `data.json` が再生成され、ブラウザを再読込すると反映される。

## ノートの書き方（frontmatter）

`vault/` 配下をフォルダで分け、frontmatter（YAML）に構造データ、本文にメモを置く。
スキーマの詳細とサンプルは `ui_kits/kurumi-dashboard/design_handoff_kurumi_dashboard/README.md`
および `vault/` 内の既存ノートを参照。

- `教材/` … `type: text`（`material_type: book` テーマ別 / `serial` 月刊）
- `テスト/` … `type: test`（`kind: 復習テスト` 得点 / `公開テスト` 偏差値）
- `間違い/` … 間違いノート（本文に問題・解答の写真 `![[...]]`）
- `報告/` … 日々の報告（`plan` チェックと `study_minutes` 学習時間）

## テスト

```bash
pnpm --filter pipeline test    # 集計・パーサのユニットテスト
```

## 補足

- 報告（日々の報告）の保存はダッシュボードからは行わない（読取専用）。報告ノートは
  Obsidian / Claude Code で直接編集する運用。将来 `app-input`（音声＋AI構造化での書込ツール）を
  別アプリとして追加する想定（Phase 2、計画参照）。
- `data.json` の一部フィールド（streak・history・本日の進捗など）は実データが揃うまでの
  暫定シード値。報告ノートが増えるにつれ段階的に実データ化する。
- デザインは `ui_kits/kurumi-dashboard/` のプロトタイプを正解として再現。元のデザインシステム
  （styles.css / 部品バンドル）が同梱されていないため、トークンとUIプリミティブは
  README記載値から再構築している（`shared/tokens.css`・`app-dashboard/src/ui/`）。
