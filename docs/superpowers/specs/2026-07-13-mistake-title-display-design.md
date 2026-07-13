# 間違い直し テスト系間違いのタイトル表示改善 — 設計ドキュメント

作成日: 2026-07-13
ステータス: 確定（ユーザー承認済み）

## 1. 背景・目的

間違い直し画面で実際に運用してみたところ、「復習テスト」「公開テスト」カテゴリの間違いは、一覧行・詳細パネルの見出しに`question`（問題のタイトル・問題番号）だけが表示され、どのテストの何問目かが一目で分からない（例:「7/12」「２－３」とだけ表示される）という問題が見つかった。

## 2. スコープ

### 対象
- 「復習テスト」「公開テスト」カテゴリの間違いについて、一覧行のタイトルと詳細パネルの見出しに、種類（テスト名）・実施日・科目・問題名をまとめた合成タイトルを表示する。

### スコープ外
- 「テキスト」カテゴリの表示（現状の`item.question`のままでよい、変更しない）
- データモデル・vaultのfrontmatターの変更（表示のみの変更。既存の`question`/`theme`/`source`/`subject`フィールドはそのまま使う）
- 間違いの編集機能・Googleドライブ一括保存機能（別スペックで扱う）

## 3. 表示ロジック

`app-dashboard/src/screens/Mistakes.tsx` に以下のヘルパー関数を追加する:

```ts
function getDisplayTitle(item: MistakeNote): string {
  if (item.category === "テキスト") return item.question;
  return [item.theme, item.source, item.subject, item.question].filter(Boolean).join("・");
}
```

- `復習テスト`/`公開テスト`のとき: `テスト名（例:第640回公開テスト）・日付（例:7/12）・科目（例:算数）・問題名（例:(6)）` の順に「・」で連結。値が空文字の項目はスキップする。
- `テキスト`のとき: 従来通り`item.question`をそのまま返す。

この関数を以下2箇所で、これまで`item.question`を直接使っていた部分の代わりに使う:
- `MistakeRow`コンポーネントの一覧行タイトル（太字テキスト部分）
- `MistakeDetail`コンポーネントの見出し（`<h3>`部分）

データモデル・パイプライン・vaultへの書込は変更しない。表示専用の変更であり、既存の`item.source`（日付表示や出典表示に他で使われている）の意味も変えない。

## 4. 影響ファイル一覧

- `app-dashboard/src/screens/Mistakes.tsx`: `getDisplayTitle`関数の追加、`MistakeRow`/`MistakeDetail`での使用箇所の置き換え
