# 間違い直し 編集機能 — 設計ドキュメント

作成日: 2026-07-14
ステータス: 確定（ユーザー承認済み）

## 1. 背景・目的

間違い直し画面には現在、間違いの新規追加・一群/二群の振り分けはできるが、一度保存した間違いの内容を後から修正する手段がない。実際の運用で「間違いの内容を直したい」というニーズが出たため、編集機能を追加する。

## 2. スコープ

### 対象
- 保存済みの間違い（一群・二群どちらでも）について、間違い追加フォームの全項目（科目・カテゴリ・単元・テキスト名/ページ or 出典・テーマ/テスト名・問題・理由・メモ・写真2枚）を編集できるようにする。
- 写真の差し替え（新しい写真を選べば上書き、選ばなければ既存のまま保持）。

### スコープ外
- `count`（間違い回数）・`date`（日付）の編集UI — 今回は追加しない。既存の値をそのまま維持する（誤って「今日・1回目」に上書きされるのを防ぐため）。
- `group`（一群/二群）の編集時の変更 — 編集では変更しない（既存の振り分けボタンで行う）。
- 複数間違いの一括編集、編集履歴・差分表示。

## 3. UI・ルーティング

### Mistakes画面（`app-dashboard/src/screens/Mistakes.tsx`）
`MistakeDetail`に「編集する」ボタンを追加する。「二群に移動する」ボタンの隣（左側）に配置する。クリック時は親コンポーネントから受け取る`onEdit(item: MistakeNote)`コールバックを呼ぶ。

### App.tsx
- `editingMistake: MistakeNote | null` のstateを追加。
- `Mistakes`に`onEdit={(item) => { setEditingMistake(item); go("add"); }}`を渡す。
- `AddMistake`に`editItem={editingMistake}`を渡し、`onBack`（キャンセル・保存後どちらも）で`editingMistake`を`null`に戻してから`mistakes`画面に遷移する。
- 「記録する」ボタン（TopBar）や`Mistakes`の「間違いを追加」ボタンなど、新規作成のために`add`画面に遷移する既存の導線は、必ず`editingMistake`を`null`にリセットしてから遷移する（編集状態が誤って持ち越されないようにする）。

### AddMistake画面（`app-dashboard/src/screens/AddMistake.tsx`）
- 新しいprop `editItem?: MistakeNote` を受け取る。
- `editItem`が渡された場合、フォームの各stateを`editItem`の値で初期化する（`useState`の初期値はコンポーネントマウント時に一度だけ評価されるため、`editItem`がある場合は毎回新しい`AddMistake`インスタンスとしてマウントされる前提とする。App.tsx側で`<AddMistake key={editingMistake?.id ?? "new"} .../>` のように`key`を切り替え、編集対象が変わるたびに正しく再初期化されるようにする）。
- 写真スロット（`UploadSlot`）に、既存の写真URL（`editItem.questionPhoto`/`answerPhoto`）を初期プレビューとして表示する機能を追加する（`UploadSlot`に`initialPreviewUrl?: string`propを追加。ユーザーが新しい写真を選ぶとそちらが優先され、選ばなければ`initialPreviewUrl`のまま＝既存写真を維持）。
- 保存ボタンのラベルは、`editItem`がある場合は「更新する」、無い場合は従来通り「間違いを保存」。
- 保存処理は、`editItem`がある場合は`updateMistakeApi(editItem.id, payload)`を呼び、無い場合は従来通り`createMistakeApi(payload)`を呼ぶ。

## 4. 書込・API

### `pipeline/src/write.ts`
新規関数 `updateMistake(vaultDir: string, id: string, fields: UpdateMistakeInput): Promise<void>` を追加する。

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
  questionPhotoDataUrl?: string; // 新しい写真を選んだ場合のみ
  answerPhotoDataUrl?: string;   // 新しい写真を選んだ場合のみ
}
```

処理内容:
1. `id`をパストラバーサル対策済みの形で検証（既存の`setMistakeGroup`と同様のガードを再利用）。
2. 既存ノートを読み込み、`group`・`count`・`date`は**既存のfrontmatterの値をそのまま引き継ぐ**（fieldsには含まれないため上書きされない）。
3. `subject`/`unit`/`theme`/`category`/`reason`/`question`は渡された値で上書き。カテゴリに応じて`text_title`/`page`または`source`を書き換える（`createMistake`と同じ分岐ロジックを再利用）。
4. 本文（`note`）を渡された値で上書き。
5. 写真: `questionPhotoDataUrl`/`answerPhotoDataUrlが渡されていれば、新しい添付ファイルを保存し、既存の`question_photo`/`answer_photo`が指すファイル（拡張子込みで異なる可能性がある）を削除してから新しいファイル名をfrontmatterに設定する。渡されていなければ、既存の`question_photo`/`answer_photo`フィールドをそのまま維持する。
6. 同じファイル名（同じ`id`）でノートを上書き保存する。

**注記（カテゴリ切替時の整合性）**: frontmatterは既存ファイルの内容を丸ごと引き継ぐのではなく、`group`/`count`/`date`/（差し替えなしの場合の）`question_photo`/`answer_photo`のみを明示的に引き継ぎ、それ以外は今回の`fields`から新規に組み立てる。そのため、例えば編集で「テキスト」から「復習テスト」にカテゴリを変更した場合、古い`text_title`/`page`は書き込まれず、新たに`source`が書き込まれる（`createMistake`と同じカテゴリ分岐ロジックを使うため、両カテゴリのfrontmatterが混在することはない）。

`createMistake`と重複するロジック（写真デコード・保存、カテゴリ別frontmatter組み立て）は、共通の内部ヘルパー関数に切り出して両方から使う。

### `app-dashboard/vite-plugins/vault-api.ts`
新しいルートを追加: `POST /api/mistakes/:id`（`/group`ではない、間違いid直下へのPOST）→ `updateMistake(VAULT, id, body)`を呼び`{ ok: true }`を返す。

### `app-dashboard/src/api.ts`
新規関数 `updateMistakeApi(id: string, payload: UpdateMistakePayload): Promise<void>` を追加。`CreateMistakePayload`と同じ構造だが`count`/`date`を含まない`UpdateMistakePayload`型を定義する。

## 5. 影響ファイル一覧

- `pipeline/src/write.ts`: `updateMistake`関数の追加、`createMistake`との共通ロジック抽出
- `pipeline/test/write.test.ts`: `updateMistake`のテスト追加
- `app-dashboard/vite-plugins/vault-api.ts`: `POST /api/mistakes/:id`ルート追加
- `app-dashboard/src/api.ts`: `updateMistakeApi`・`UpdateMistakePayload`追加
- `app-dashboard/src/screens/AddMistake.tsx`: `editItem`prop対応、`UploadSlot`に`initialPreviewUrl`追加、保存処理の分岐
- `app-dashboard/src/screens/Mistakes.tsx`: `onEdit`prop追加、「編集する」ボタン追加
- `app-dashboard/src/App.tsx`: `editingMistake`state追加、ルーティング配線
