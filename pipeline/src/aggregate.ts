import {
  SUBJECT_COLORS,
  type SubjectName, type TextMaterial, type SubjectStats,
  type MaterialBreakdown, type CalendarData,
} from "shared";

export function subjectStats(subjectName: SubjectName, texts: TextMaterial[]): SubjectStats {
  const mats = texts.filter((t) => t.subject === subjectName);
  let doneQ = 0, totalQ = 0;
  const materials: MaterialBreakdown[] = mats.map((mat) => {
    let d: number, t: number, sub: string;
    if (mat.materialType === "serial" && mat.current && mat.volumes && mat.volumesTotal) {
      const per = mat.current.total;
      t = mat.volumesTotal * per;
      d = Math.round(mat.volumes.reduce((a, v) => a + v, 0) / 100 * per);
      const doneVols = mat.volumes.filter((v) => v >= 100).length;
      sub = `${doneVols}/${mat.volumesTotal}冊`;
    } else {
      const themes = mat.themes ?? [];
      t = themes.reduce((a, x) => a + x.total, 0);
      d = themes.reduce((a, x) => a + x.done, 0);
      const doneT = themes.filter((x) => x.done >= x.total).length;
      sub = `${doneT}/${themes.length}テーマ`;
    }
    doneQ += d; totalQ += t;
    const pct = t ? Math.round((d / t) * 100) : 0;
    return { id: mat.id, title: mat.title, type: mat.materialType, done: d, total: t, pct, sub, todayDone: mat.todayDone };
  });
  return {
    pct: totalQ ? Math.round((doneQ / totalQ) * 100) : 0,
    doneQ, totalQ, remainQ: totalQ - doneQ,
    todayDone: mats.reduce((a, m) => a + (m.todayDone || 0), 0),
    materials,
  };
}

type CalendarSeed = Omit<CalendarData, "plan" | "reports">;

export function buildCalendar(cal: CalendarSeed): CalendarData {
  const color = (name: SubjectName) => SUBJECT_COLORS[name] ?? "var(--ink-faint)";
  const tmpl: Record<number, [SubjectName, string][]> = {
    0: [["算数", "プラスワン"], ["理科", "メモリーチェック"]],
    1: [["国語", "漢字の要"], ["算数", "日々の演習"]],
    2: [["社会", "コアプラス"], ["算数", "プラスワン"]],
    3: [["理科", "メモリーチェック"], ["国語", "漢字の要"]],
    4: [["算数", "プラスワン"], ["社会", "Z会"]],
    5: [["算数", "日々の演習"], ["国語", "漢字の要"], ["理科", "メモリーチェック"]],
    6: [],
  };
  const daysInMonth = new Date(cal.year, cal.month, 0).getDate();
  const plan: CalendarData["plan"] = {};
  const reports: CalendarData["reports"] = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const idx = (d - 1 + ((cal.firstWeekday + 6) % 7)) % 7;
    const items = (tmpl[idx] ?? []).map((it) => ({ subj: it[0], mat: it[1], color: color(it[0]) }));
    plan[d] = items;
    if (d < cal.today && items.length && d !== cal.today - 1) {
      reports[d] = { done: items.map(() => true), note: "" };
    }
  }
  return { ...cal, plan, reports };
}
