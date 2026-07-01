import { describe, it, expect } from "vitest";
import { normalizeDigits } from "../src/normalizeDigits.js";

describe("normalizeDigits", () => {
  it("全角数字を半角に変換する", () => {
    expect(normalizeDigits("３２")).toBe("32");
  });

  it("半角数字はそのまま", () => {
    expect(normalizeDigits("32")).toBe("32");
  });

  it("数字以外の文字（範囲表記のハイフン等）はそのまま残す", () => {
    expect(normalizeDigits("３２−３４")).toBe("32−34");
  });

  it("空文字はそのまま", () => {
    expect(normalizeDigits("")).toBe("");
  });
});
