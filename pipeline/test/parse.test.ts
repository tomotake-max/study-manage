import { describe, it, expect } from "vitest";
import { parseVault } from "../src/parse.js";
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
});
