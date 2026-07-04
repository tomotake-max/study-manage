# 間違い直し 写真の保存・表示 — 設計ドキュメント

作成日: 2026-07-03
ステータス: 確定（ユーザー承認済み）

## 1. 背景・位置づけ

これは3つのサブプロジェクトの1番目（写真保存・表示 → 一括保存 → テキスト別グルーピング、の順で進める合意済み）。

現状、間違い追加フォーム（`AddMistake.tsx`）で「テキストの該当箇所」「答案・解答用紙」の写真を選択しても、ブラウザのプレビュー表示のみで実際には保存されない（前回の実装スペックで意図的にスコープ外にした部分）。そのため間違い直し画面の詳細パネルでは常に固定のプレースホルダー（「問題の写真」アイコン）しか表示されず、ユーザーが「写真が見れない」と感じる原因になっている。本スペックはこれを解消し、実際に写真を保存・表示できるようにする。

## 2. スコープ

### 対象
- 間違い追加フォームで選択した写真（問題側・答案側の2枚、Google ドライブ経由も含む）を実際にvaultへ保存する
- 間違い直し画面の詳細パネルで、保存された写真を実際に表示する
- 答案・解答用紙の写真は「ぼかしておき、クリックで表示」の挙動を保つ（登録フォームと同じUX）

### スコープ外（今回はやらない）
- 保存済み間違いの写真の削除・差し替え（そもそも編集機能自体がまだ無い）
- 画像のリサイズ・圧縮（アップロードされたものをそのまま保存）
- 既存の1件のサンプルノート（`2026-06-24-速さ-追い越し.md`）の写真移行（元々写真データが無いため対象外）
- 本スペックの後続サブプロジェクトである「複数選択→Googleドライブ等へ一括保存」「テキスト別グルーピング」（別スペックで扱う）

## 3. データモデル変更（`shared/src/schema.ts`）

`MistakeNote` に以下を追加する:

```ts
export interface MistakeNote {
  // ...既存フィールドはそのまま...
  questionPhoto?: string;  // 表示用URLパス（例: "/attachments/2026-07-03-速さ-旅人算-question.jpg"）。未アップロード時は未設定
  answerPhoto?: string;    // 同上（答案・解答用紙側）
}
```

## 4. 保存の仕組み

### 4.1 クライアント側（`app-dashboard/src/screens/AddMistake.tsx`）

保存(`handleSave`)時に、既に親コンポーネントの state に載っている `photo1`/`photo2`（`File`オブジェクト、ローカル選択・Googleドライブ経由のどちらでも同じ形）を `FileReader.readAsDataURL` で base64 data URL 文字列に変換し、`createMistakeApi` の呼び出しに `questionPhotoDataUrl`/`answerPhotoDataUrl` として含める（未選択なら省略）。

### 4.2 クライアントAPI（`app-dashboard/src/api.ts`）

`CreateMistakePayload` に `questionPhotoDataUrl?: string` / `answerPhotoDataUrl?: string` を追加。既存の3関数の実装パターン（fetch→JSON）はそのまま踏襲。

### 4.3 書込ロジック（`pipeline/src/write.ts`）

`CreateMistakeInput` に `questionPhotoDataUrl?: string` / `answerPhotoDataUrl?: string` を追加。`createMistake`は、ノートのファイル名（衝突時の連番付与を含めて確定済みの`id`）が決まった後に、渡された場合は以下を行う:
1. data URL（`data:image/jpeg;base64,....`）から MIME タイプと base64本体を分離し、`Buffer.from(base64, "base64")` でデコード
2. MIMEタイプから拡張子を決定（`image/jpeg`→`jpg`, `image/png`→`png`, `image/webp`→`webp`、不明なら`jpg`にフォールバック）
3. `vault/間違い/attachments/<id>-question.<拡張子>` / `<id>-answer.<拡張子>` に書き込む（`attachments/`ディレクトリが無ければ作成）
4. frontmatterに `question_photo: "<id>-question.<拡張子>"` / `answer_photo: "<id>-answer.<拡張子>"`（ファイル名のみ、`attachments/`からの相対名）を記録

### 4.4 パース（`pipeline/src/parse.ts`）

mistakeケースで `fm.question_photo`/`fm.answer_photo` を読み、存在すれば `questionPhoto: `/attachments/${fm.question_photo}`` のようにURL文字列へ変換して`MistakeNote`に含める。無ければ`undefined`。

### 4.5 ビルド（`pipeline/src/build.ts`）

`vault/間違い/attachments/` ディレクトリが存在すれば、中身を丸ごと `app-dashboard/public/attachments/` にコピーする（`fs.cp`の再帰コピー。個別ファイル単位の対応付けはせず、ディレクトリ全体コピーでシンプルにする）。既存の`data.json`と同様、コピー先はビルド生成物として`.gitignore`に追加する。

## 5. 表示（`app-dashboard/src/screens/Mistakes.tsx`）

`MistakeDetail`コンポーネントの写真プレースホルダー部分を書き換え:
- `item.questionPhoto`があれば実際の`<img src={item.questionPhoto}>`を表示、無ければ従来通りのプレースホルダー（「問題の写真」アイコン）
- `item.answerPhoto`があれば、`AddMistake.tsx`の`UploadSlot`と同様の「ぼかし表示→クリックで表示/隠す」の挙動を持つ小コンポーネントとして表示する（`filter: blur(...)` + クリックで`revealed`状態を切り替え）。無ければプレースホルダー表示のまま。

## 6. .gitignore

`app-dashboard/public/attachments/` を追加（`app-dashboard/public/data.json`と同様の扱い）。

## 7. 影響ファイル一覧

- `shared/src/schema.ts`: `MistakeNote.questionPhoto?`/`answerPhoto?` 追加
- `pipeline/src/write.ts`: `CreateMistakeInput`拡張、`createMistake`に写真書込ロジック追加
- `pipeline/src/parse.ts`: mistakeケースで写真フィールドを読み取り
- `pipeline/src/build.ts`: `attachments/`ディレクトリのコピー処理追加
- `app-dashboard/src/api.ts`: `CreateMistakePayload`拡張
- `app-dashboard/src/screens/AddMistake.tsx`: 保存時にbase64変換して送信
- `app-dashboard/src/screens/Mistakes.tsx`: 詳細パネルの写真表示（問題側は通常表示、答案側はぼかし→クリック表示）
- `.gitignore`: `app-dashboard/public/attachments/` 追加
