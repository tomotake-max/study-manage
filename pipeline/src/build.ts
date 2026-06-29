import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseVault } from "./parse.js";
import { subjectStats, buildCalendar } from "./aggregate.js";
import {
  SUBJECT_COLORS, SUBJECT_IDS,
  type DashboardData, type SubjectName, type SubjectId, type SubjectStats,
} from "shared";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VAULT = path.join(ROOT, "vault");
const OUT = path.join(ROOT, "app-dashboard/public/data.json");

export async function build(): Promise<DashboardData> {
  const v = await parseVault(VAULT);
  const names: SubjectName[] = ["算数", "国語", "理科", "社会"];

  const stats = {} as Record<SubjectId, SubjectStats>;
  const subjects = names.map((name) => {
    const s = subjectStats(name, v.texts);
    stats[SUBJECT_IDS[name]] = s;
    const open = v.texts.filter((t) => t.subject === name && s.materials.find((m) => m.id === t.id && m.pct < 100)).length;
    return { id: SUBJECT_IDS[name], name, chart: SUBJECT_COLORS[name], progress: s.pct, open, total: s.totalQ };
  });

  const minBySubject: Record<string, number> = {};
  for (const r of v.reports)
    for (const [subj, min] of Object.entries(r.studyMinutes)) minBySubject[subj] = (minBySubject[subj] ?? 0) + (min ?? 0);
  const monthBySubject = names.map((name) => ({ name, min: minBySubject[name] ?? 0, q: 0 }));

  const calendar = buildCalendar({
    year: 2026, month: 6, label: "2026年 6月", firstWeekday: 1, today: 29, goal: 120,
    days: {}, monthBySubject,
  });

  const data: DashboardData = {
    user: { name: "くるみ", grade: "小学5年生", course: "中学受験コース" },
    nextTest: { name: "7月度 公開テスト", daysLeft: 9 },
    today: { progressPct: 72, minutes: 84, goalMinutes: 120, reviewed: v.mistakes.filter((m) => m.done).length, queued: v.mistakes.filter((m) => !m.done).length },
    streak: { current: 9, best: 18 },
    calendar, history: [50,70,30,0,90,110,60,80,20,75,100,55,120,84],
    subjects, categories: ["テキスト", "復習テスト", "公開テスト"],
    texts: v.texts, tests: v.tests,
    reasons: ["計算ミス","問題の読みまちがい","おぼえていない","考え方のミス","時間切れ","うっかりミス"],
    mistakes: v.mistakes.map((m, i) => ({ ...m, id: m.id || String(i + 1) })),
    stats,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 2), "utf8");
  return data;
}

if (import.meta.url === `file://${process.argv[1]}`) build().then(() => console.log("data.json written:", OUT));
