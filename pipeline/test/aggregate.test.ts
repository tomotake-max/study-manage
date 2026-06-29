import { describe, it, expect } from "vitest";
import { subjectStats, buildCalendar } from "../src/aggregate.js";
import type { TextMaterial } from "shared";

const book: TextMaterial = {
  id: "ma-plus1", subject: "算数", title: "プラスワン問題集", publisher: "東京出版",
  materialType: "book", todayDone: 8,
  themes: [
    { name: "和差算", total: 10, done: 10 },
    { name: "つるかめ算", total: 12, done: 6 },
  ],
};

describe("subjectStats", () => {
  it("book はテーマの done/total を合計し pct を出す", () => {
    const s = subjectStats("算数", [book]);
    expect(s.doneQ).toBe(16);
    expect(s.totalQ).toBe(22);
    expect(s.pct).toBe(73);
    expect(s.todayDone).toBe(8);
    expect(s.materials[0].sub).toBe("1/2テーマ");
  });

  it("serial は号の達成率を問数換算する", () => {
    const serial: TextMaterial = {
      id: "ma-hibi", subject: "算数", title: "日々の演習", publisher: "月刊",
      materialType: "serial", todayDone: 6, volumesTotal: 3,
      current: { label: "6月号", unit: "速さ", total: 32, done: 20 },
      volumes: [100, 100, 50],
    };
    const s = subjectStats("算数", [serial]);
    expect(s.totalQ).toBe(96);
    expect(s.doneQ).toBe(80);
    expect(s.materials[0].sub).toBe("2/3冊");
  });
});

describe("buildCalendar", () => {
  it("曜日テンプレから当月の plan を生成し過去日を報告ずみにする", () => {
    const cal = buildCalendar({
      year: 2026, month: 6, label: "2026年 6月", firstWeekday: 1, today: 29, goal: 120,
      days: {}, monthBySubject: [],
    });
    expect(Object.keys(cal.plan).length).toBe(30);
    expect(cal.reports[1]).toBeDefined();
    expect(cal.reports[29]).toBeUndefined();
  });
});
