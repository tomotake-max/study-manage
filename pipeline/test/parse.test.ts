import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseVault } from "../src/parse.js";
import { createMistake } from "../src/write.js";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import matter from "gray-matter";

let vaultDir: string;

beforeEach(async () => {
  vaultDir = await mkdtemp(path.join(tmpdir(), "studyboard-parse-"));
});

afterEach(async () => {
  await rm(vaultDir, { recursive: true, force: true });
});

describe("parseVault", () => {
  it("vault から教材・テスト・間違い・報告を読み分ける", async () => {
    await mkdir(path.join(vaultDir, "教材"), { recursive: true });
    await writeFile(
      path.join(vaultDir, "教材", "サンプル問題集.md"),
      matter.stringify("", {
        type: "text", subject: "算数", title: "サンプル問題集", publisher: "テスト出版",
        material_type: "book", today_done: 0,
        themes: [{ name: "テーマ1", total: 5, done: 5 }],
      }),
      "utf8",
    );
    await writeFile(
      path.join(vaultDir, "教材", "サンプル月刊.md"),
      matter.stringify("", {
        type: "text", subject: "算数", title: "サンプル月刊", publisher: "テスト月刊",
        material_type: "serial", today_done: 0, volumes_total: 3,
        current: { label: "1月号", unit: "テスト", total: 10, done: 5 },
        volumes: [100, 50, 0],
      }),
      "utf8",
    );

    await mkdir(path.join(vaultDir, "テスト"), { recursive: true });
    await writeFile(
      path.join(vaultDir, "テスト", "サンプル公開テスト.md"),
      matter.stringify("", {
        type: "test", kind: "公開テスト", subject: "4科総合", name: "サンプル公開テスト",
        date: "7/1", range: "全範囲", deviation: 55, reviewed: false,
      }),
      "utf8",
    );

    await createMistake(vaultDir, {
      subject: "算数", unit: "速さ", theme: "テーマ", category: "テキスト",
      textTitle: "サンプル問題集", page: "1",
      reason: "計算ミス", question: "サンプル問題", note: "",
      count: 1, date: "7/1",
    });

    await mkdir(path.join(vaultDir, "報告"), { recursive: true });
    await writeFile(
      path.join(vaultDir, "報告", "2026-07-01.md"),
      matter.stringify("", {
        date: "2026-07-01",
        plan: [{ subject: "算数", material: "サンプル問題集", done: true }],
        study_minutes: { 算数: 30 },
      }),
      "utf8",
    );

    const r = await parseVault(vaultDir);
    expect(r.texts.find((t) => t.id === "サンプル問題集")?.materialType).toBe("book");
    expect(r.texts.find((t) => t.title === "サンプル月刊")?.materialType).toBe("serial");
    expect(r.tests.some((t) => t.kind === "公開テスト")).toBe(true);
    expect(r.mistakes[0].subject).toBe("算数");
    expect(r.reports[0].plan.length).toBeGreaterThan(0);
  });

  it("groupが未設定の間違いノートはgroup:1として読める", async () => {
    await mkdir(path.join(vaultDir, "間違い"), { recursive: true });
    await writeFile(
      path.join(vaultDir, "間違い", "サンプル間違い.md"),
      matter.stringify("", {
        subject: "算数", unit: "速さ", theme: "追い越し", category: "テキスト",
        source: "速さテキスト p.32", reason: "考え方のミス", question: "サンプル問題",
        count: 3, date: "6/24",
      }),
      "utf8",
    );

    const r = await parseVault(vaultDir);
    const m = r.mistakes.find((x) => x.id === "サンプル間違い");
    expect(m?.group).toBe(1);
    expect(m?.source).toBe("速さテキスト p.32");
  });

  describe("text_title/pageからのsource合成", () => {
    it("text_title/pageを持つ間違いノートはsourceを`${text_title} p.${page}`として合成する", async () => {
      const { id } = await createMistake(vaultDir, {
        subject: "算数", unit: "速さ", theme: "旅人算", category: "テキスト",
        textTitle: "テスト教材", page: "10",
        reason: "計算ミス", question: "旅人算の応用", note: "図を描かず計算した",
        count: 1, date: "7/2",
      });

      const r = await parseVault(vaultDir);
      const m = r.mistakes.find((x) => x.id === id);
      expect(m?.source).toBe("テスト教材 p.10");
    });
  });

  describe("写真フィールドのパース", () => {
    it("question_photo/answer_photoがあればURLパスとして読み込む", async () => {
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

      const r = await parseVault(vaultDir);
      const m = r.mistakes.find((x) => x.id === id);
      expect(m?.questionPhoto).toBe(`/attachments/${id}-question.png`);
      expect(m?.answerPhoto).toBe(`/attachments/${id}-answer.png`);
    });

    it("写真が無ければquestionPhoto/answerPhotoはundefined", async () => {
      const { id } = await createMistake(vaultDir, {
        subject: "算数", unit: "速さ", theme: "追い越し写真なし", category: "テキスト",
        textTitle: "速さテキスト", page: "32",
        reason: "考え方のミス", question: "サンプル問題", note: "",
        count: 1, date: "6/24",
      });

      const r = await parseVault(vaultDir);
      const m = r.mistakes.find((x) => x.id === id);
      expect(m?.questionPhoto).toBeUndefined();
      expect(m?.answerPhoto).toBeUndefined();
    });
  });
});
