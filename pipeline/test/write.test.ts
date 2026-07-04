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

  it("idにパストラバーサルを含む場合は例外を投げてvault外に触れない", async () => {
    // vaultDirの外側に的となるファイルを用意し、書き換えられていないことを確認する
    const outsideDir = await mkdtemp(path.join(tmpdir(), "studyboard-outside-"));
    try {
      const outsideFile = path.join(outsideDir, "evil.md");
      await writeFile(outsideFile, matter.stringify("元のメモ", { group: 1 }), "utf8");

      const dir = path.join(vaultDir, "間違い");
      await mkdir(dir, { recursive: true });

      const relativeId = path.relative(dir, outsideFile).replace(/\.md$/, "");
      await expect(setMistakeGroup(vaultDir, relativeId, 2)).rejects.toThrow();
      await expect(setMistakeGroup(vaultDir, "../evil", 2)).rejects.toThrow();
      await expect(setMistakeGroup(vaultDir, "foo/../../bar", 2)).rejects.toThrow();

      const raw = await readFile(outsideFile, "utf8");
      const parsed = matter(raw);
      expect(parsed.data.group).toBe(1);
      expect(parsed.content.trim()).toBe("元のメモ");
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
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

  it("タイトルに特殊文字が含まれる場合はファイル名から除去する", async () => {
    const { id } = await createMaterialStub(vaultDir, "算数", "テスト/教材:特別編?");
    expect(id).toBe("テスト教材特別編");
    const raw = await readFile(path.join(vaultDir, "教材", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.title).toBe("テスト/教材:特別編?");
  });

  it("タイトルがサニタイズ後に空になる場合は例外を投げる", async () => {
    await expect(createMaterialStub(vaultDir, "算数", "///")).rejects.toThrow();
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

  it("テキストカテゴリでtextTitle/pageが未指定でも例外を投げず空文字を保存する", async () => {
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "旅人算", category: "テキスト",
      reason: "計算ミス", question: "旅人算の応用", note: "図を描かず計算した",
      count: 1, date: "7/2",
    });
    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.text_title).toBe("");
    expect(parsed.data.page).toBe("");
  });

  it("テスト系カテゴリでsourceが未指定でも例外を投げず空文字を保存する", async () => {
    const { id } = await createMistake(vaultDir, {
      subject: "国語", unit: "", theme: "第3回", category: "復習テスト",
      reason: "おぼえていない", question: "漢字の書き取り", note: "",
      count: 1, date: "7/2",
    });
    const raw = await readFile(path.join(vaultDir, "間違い", `${id}.md`), "utf8");
    const parsed = matter(raw);
    expect(parsed.data.source).toBe("");
  });

  it("単元・テーマに特殊文字が含まれる場合はファイル名から除去する", async () => {
    const { id } = await createMistake(vaultDir, {
      subject: "算数", unit: "速さ/距離", theme: "旅人算?", category: "テキスト",
      textTitle: "プラスワン問題集", page: "45",
      reason: "計算ミス", question: "特殊文字テスト", note: "",
      count: 1, date: "7/2",
    });
    expect(id).not.toMatch(/[\\/:*?"<>|]/);
  });

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

  it("未対応のMIMEタイプのdata URLはどの写真枠かを含むエラーを投げる", async () => {
    await expect(
      createMistake(vaultDir, {
        subject: "算数", unit: "速さ", theme: "未対応MIMEタイプ", category: "テキスト",
        textTitle: "プラスワン問題集", page: "1",
        reason: "計算ミス", question: "未対応MIMEタイプの問題", note: "",
        count: 1, date: "7/3",
        questionPhotoDataUrl: "data:image/bmp;base64,AAAA",
      }),
    ).rejects.toThrow(/unsupported image type: image\/bmp.*question|question.*unsupported image type: image\/bmp/s);
  });
});
