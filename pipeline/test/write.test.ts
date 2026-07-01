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
