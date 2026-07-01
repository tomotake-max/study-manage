# 間違い直し 一群/二群振り分け・テキスト登録改善 — 設計ドキュメント

作成日: 2026-07-02
ステータス: 確定（ユーザー承認済み・self-review済み）

## 1. 目的・背景

くるみ学習ダッシュボードの「間違い直し」画面に対する機能追加。

1. 間違い一覧から、まだ理解できておらず要復習な問題（一群）と、復習して間違いのストックから外していい問題（二群）を振り分けられるようにしたい。
2. 音声入力は引き続きAqua Voice（OSレベルの音声入力アプリ）をそのまま使う。基本の入力方式は現状維持でよいが、Aqua Voiceの誤認識を減らすため、既に登録されているテキスト名をAqua Voiceの辞書に登録しやすくする支援画面がほしい。
3. 間違い追加フォームで「テキスト名」と「ページ数」を分離したい。テキスト名は科目ごとにプルダウン選択（既存登録教材から）、新規作成も可能に。
4. ページ数は全角・半角どちらで入力してもよく、常に半角数字に正規化して保存・表示する。

## 2. スコープ

### 対象

- 間違い直し一覧の「一群（要復習・ストック中）／二群（直しずみ・ストック外）」振り分けと、専用タブでの二群一覧表示
- 間違い追加フォームの「テキスト名」プルダウン化（科目で絞り込み、新規作成も可）＋「ページ数」分離（全角→半角正規化）
- vaultへの実書込API（振り分け・新規テキスト登録・新規間違い登録）
- Aqua Voice辞書登録支援（登録済みテキスト名一覧をコピーしやすく表示するパネル）

### スコープ外（今回はやらない）

- 写真（問題・解答用紙）の実ファイル保存 — 現状通りプレビューのみ、vaultへの画像書込は対象外
- 音声→自動仕分け（Phase 2のClaude haiku構造化） — 今回はAqua Voiceの手動辞書のみ
- Aqua Voiceへの自動（API経由）辞書登録 — 調査の結果、Aqua Voiceの辞書機能はアプリ内手動登録のみで、外部からのインポートAPI・一括登録の仕組みは公開されていない（Dictionary機能: Pro版で最大800件、手動で「+ Add」ボタンから登録）。よって「自動登録」ではなく「登録の手間を減らすアシスト画面」を用意する方針。
- ダッシュボードのその他の暫定値（`today.progressPct`／`streak`／`history`／`nextTest`等）の実データ化 — 別件（後述の「4. 参考: 今回のついで修正」および「6. 今後の改善候補」参照）

## 3. データモデル変更（`shared/src/schema.ts`）

`MistakeNote` を以下のように変更する:

```ts
export interface MistakeNote {
  id: string;
  subject: SubjectName;
  unit: string;
  theme: string;
  category: MistakeCategory;
  source: string;        // 表示用。category==="テキスト"のときはpipelineがtextTitle+pageから自動合成
  textTitle?: string;     // category==="テキスト"のときのみ。テキスト名（vault/教材/のtitleと対応）
  page?: string;          // category==="テキスト"のときのみ。半角数字に正規化済み文字列（例: "32", "32-34"）
  reason: string;
  question: string;
  note: string;
  count: number;
  date: string;           // 表示用 "M/D" 形式（既存踏襲、例: "7/2"）
  group: 1 | 2;           // 1=一群（要復習・ストック中）, 2=二群（直しずみ・ストック外）
}
```

`done: boolean` は廃止し `group: 1 | 2` に置き換える。既存の「直しずみ／直す」バッジ表示は `group===2` で判定するため見た目は変わらない。

frontmatterのキー命名は既存の慣習（snake_case）に合わせる: `text_title`, `page`, `group`。`category !== "テキスト"` の間違いノートは従来通り `source` を直接frontmatterに書く（変更なし）。

## 4. アーキテクチャ：ローカル書込API（vaultへの実書込）

Phase 1は「読取専用」方針だったが、本機能では実際に振り分け・新規テキスト・新規間違いをvaultファイルに書き込む。

**書込ロジック（`pipeline/src/write.ts` を新設）:**

- `setMistakeGroup(id: string, group: 1 | 2): Promise<void>` — `vault/間違い/<id>.md` を読み込み、frontmatterの `group` を更新して書き戻す（gray-matterで解析・再シリアライズ、本文は保持）。
- `createMaterialStub(subject: SubjectName, title: string): Promise<{ id: string }>` — `vault/教材/<title>.md` が存在しなければ、最小限のfrontmatter（`type: text, subject, title, publisher: "", material_type: book, today_done: 0, themes: []`）で新規作成。既に存在する場合は何もせずそのidを返す（冪等）。
- `createMistake(fields: Omit<MistakeNote, "id" | "group">): Promise<{ id: string }>` — `vault/間違い/<YYYY-MM-DD>-<unit>-<theme>.md` を新規作成（`group: 1` 固定、`unit`/`theme`はファイル名に使えない文字を除去してサニタイズ、同名衝突時は末尾に `-2` 等の連番を付与）。`category==="テキスト"` の場合は `text_title`/`page` を書き込み、`source` はfrontmatterに書かない。

**API層（`app-dashboard` に Vite `configureServer` プラグインを新設）:**

- `app-dashboard/vite-plugins/vault-api.ts` で以下のローカル専用エンドポイントを生やす（`pnpm dev` の開発サーバー内のみ、ビルド後の静的サイトには存在しない）:
  - `POST /api/mistakes/:id/group` body `{ group: 1 | 2 }` → `setMistakeGroup` を呼び `{ ok: true }`
  - `POST /api/materials` body `{ subject, title }` → `createMaterialStub` を呼び `{ id }`
  - `POST /api/mistakes` body（`MistakeNote` から `id`/`group` を除いたフィールド一式） → `createMistake` を呼び `{ id }`
- `app-dashboard/package.json` に `"pipeline": "workspace:*"` を追加し、`write.ts` の関数を直接importして再利用する。

**クライアント側の反映:**

- API呼び出し成功後、Reactの状態を楽観的更新（一覧から即座に消す/移動する）。
- `pnpm watch:data`（既存のchokidar監視）がvault変更を検知して `data.json` を再生成する。ダッシュボード側は書込成功から約800ms後に `data.json` を再fetchし、集計値（`stats`・`today.reviewed/queued`等）を含めて最終的に整合させる。
- **前提:** この機能を使うには `pnpm dev` と `pnpm watch:data` を両方起動している必要がある（ルート`README.md`に追記する）。

## 5. 画面仕様

### 5.1 Mistakes画面（`app-dashboard/src/screens/Mistakes.tsx`）

- 科目ピルの下に「一群（ストック）／二群」の切替タブを追加。デフォルトは一群（＝現在の一覧そのまま。二群は非表示）。
- 一覧の各行: 右端の「直しずみ／直す」バッジ（`Badge`）は廃止し、代わりにアイコンボタンを配置する。
  - 一群タブ表示中: 「二群へ移動」ボタン（例: `arrow-down-circle` アイコン）。クリックで `POST /api/mistakes/:id/group {group:2}` を呼び、一覧から即座に消える。
  - 二群タブ表示中: 「一群に戻す」ボタン（例: `undo` アイコン）。クリックで `group:1` に戻し、一覧から即座に消える。
- 詳細パネル下部にも同じ操作をボタンとして表示する（一覧を開かず詳細だけ見ている場合の導線）。
- 二群タブの一覧はレイアウトは一群と同一。視覚的な区別のため行の背景をわずかに落ち着いた色にする程度に留める。

### 5.2 AddMistake画面（`app-dashboard/src/screens/AddMistake.tsx`）

- カテゴリが「テキスト」のとき、現在の「出典・ページ」1つのinputを2つに分割する:
  - **テキスト名**: `<select>`。選択中の科目でフィルタした `props.data.texts` のタイトルを列挙し、選択させる。末尾の選択肢「＋ 新しいテキストを追加」を選ぶと、その場にテキスト入力欄が出現し任意のタイトルを入力できる。保存時、新規タイトルが入力されていれば `POST /api/materials` で先に登録してから間違いを保存する。
  - **ページ数**: 通常のtext input。`onChange` で全角数字を半角に正規化するユーティリティ（`shared/src/normalizeDigits.ts`、`normalizeDigits(input: string): string`、全角０-９(U+FF10-FF19)をコードポイント -0xFEE0で半角0-9へ変換）を通してから state に格納する（入力中も常に半角表示になる）。
- 「保存」ボタンを、現在のモック実装（`console.log` のみで実際は保存しない）から実書込に変更する:
  1. 新規テキストが入力されていれば `POST /api/materials`
  2. `POST /api/mistakes` で本体を保存
  3. 成功後、一覧画面へ戻る（既存の「保存しました」表示は流用）
  - 写真（`photo1`/`photo2`）は引き続き保存しない（スコープ外）。
  - フォームに `count`/`date` の入力欄は無いため、保存時に `count: 1`（初回の間違いとして記録）、`date: 今日の日付をM/D形式`（例: "7/2"）をクライアント側で自動付与して送信する。
- テキスト名プルダウンの近くに「辞書登録用一覧を見る」ボタンを配置する。クリックするとパネル（モーダル）が開き、`props.data.texts` から科目ごとにテキスト名を列挙する。科目単位、または全体で「コピー」ボタン（`navigator.clipboard.writeText`）を用意し、Aqua Voiceの辞書設定画面に手動で貼り付けやすくする。

## 6. 既存データの移行

- `vault/間違い/2026-06-24-速さ-追い越し.md` の frontmatter `solved: false` を `group: 1` に置き換える（実装タスクの一部として対応）。
- `pipeline/src/parse.ts` は後方互換のため `group` フィールドが無い場合は `1` をデフォルト値として扱う。

## 7. 影響ファイル一覧（実装時の申し送り）

- `shared/src/schema.ts`: `MistakeNote.done`→`group`、`textTitle?`/`page?` 追加、`normalizeDigits.ts` 新設
- `pipeline/src/parse.ts`: `done: Boolean(fm.solved)` → `group: (fm.group as 1|2) ?? 1`、テキスト時は `text_title`/`page` から `source` を自動合成
- `pipeline/src/build.ts`: `today.reviewed`/`today.queued` の集計を `m.done` → `m.group===2`/`m.group===1` に変更
- `pipeline/src/write.ts`: 新設（本ドキュメント §4）
- `app-dashboard/vite-plugins/vault-api.ts`: 新設（本ドキュメント §4）
- `app-dashboard/package.json`: `pipeline` をworkspace依存に追加
- `app-dashboard/src/screens/Mistakes.tsx`: 一群/二群タブ、振り分けアクション
- `app-dashboard/src/screens/AddMistake.tsx`: テキスト名プルダウン、ページ正規化、実書込化、辞書登録支援パネル
- `vault/間違い/2026-06-24-速さ-追い越し.md`: `solved`→`group` 移行
- ルート `README.md`: 書込機能利用時に `pnpm dev`+`pnpm watch:data` 併用が必要な旨を追記

## 8. 参考: 今回のついで修正（本スペックの実装対象外・既に対応済み）

ブレインストーミング中の雑談から見つかった別件として、`pipeline/src/build.ts` のカレンダー年月日が `year: 2026, month: 6, today: 29` 等の完全ハードコードだった問題を、`new Date()` から動的算出するよう既に修正済み（本スペックの実装タスクには含めない、参考記録）。

## 9. Phase 2 参考情報（実装対象外）

「まとめて話す→自動で項目に振り分け」を将来実装する場合のAPIコスト概算: Claude Haiku 4.5（$1/$5 per 1M tokens）で1件あたり約0.3円（入力750トークン+出力200トークン想定）。月数十件でも百円未満で、コスト面のハードルは低い。
