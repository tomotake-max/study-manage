import { describe, it, expect, afterEach } from "vitest";
import { parseVault } from "../src/parse.js";
import { createMistake } from "../src/write.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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

  it("既存の間違いノート(2026-06-24-速さ-追い越し)はgroup:1として読める", async () => {
    const r = await parseVault(VAULT);
    const m = r.mistakes.find((x) => x.id === "2026-06-24-速さ-追い越し");
    expect(m?.group).toBe(1);
    expect(m?.source).toBe("速さテキスト p.32");
  });

  describe("text_title/pageからのsource合成", () => {
    let vaultDir: string;

    afterEach(async () => {
      await rm(vaultDir, { recursive: true, force: true });
    });

    it("text_title/pageを持つ間違いノートはsourceを`${text_title} p.${page}`として合成する", async () => {
      vaultDir = await mkdtemp(path.join(tmpdir(), "studyboard-parse-"));
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
    let vaultDir: string;

    afterEach(async () => {
      await rm(vaultDir, { recursive: true, force: true });
    });

    it("question_photo/answer_photoがあればURLパスとして読み込む", async () => {
      vaultDir = await mkdtemp(path.join(tmpdir(), "studyboard-parse-photo-"));
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
      const r = await parseVault(VAULT);
      const m = r.mistakes.find((x) => x.id === "2026-06-24-速さ-追い越し");
      expect(m?.questionPhoto).toBeUndefined();
      expect(m?.answerPhoto).toBeUndefined();
    });
  });
});
