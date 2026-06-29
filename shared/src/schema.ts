// ── 科目 ───────────────────────────────
export type SubjectName = "算数" | "国語" | "理科" | "社会";
export type SubjectId = "math" | "jp" | "sci" | "soc";

// ── 教材ノート（type: text）─────────────
export interface Theme { name: string; total: number; done: number; }
export interface SerialCurrent { label: string; unit: string; total: number; done: number; }

export interface TextMaterial {
  id: string;
  subject: SubjectName;
  title: string;
  publisher: string;
  materialType: "book" | "serial";
  todayDone: number;
  themes?: Theme[];                 // book
  volumesTotal?: number;            // serial
  current?: SerialCurrent;          // serial
  volumes?: number[];               // serial 各号の達成率(0-100)
}

// ── テスト結果ノート（type: test）────────
export interface TestNote {
  id: string;
  kind: "復習テスト" | "公開テスト";
  subject: SubjectName | "4科総合";
  name: string;
  date: string;
  range: string;
  score?: number;
  deviation?: number;
  subjectDev?: Record<SubjectName, number>;
  done: boolean;
}

// ── 間違いノート ─────────────────────────
export type MistakeCategory = "テキスト" | "復習テスト" | "公開テスト";
export interface MistakeNote {
  id: string;
  subject: SubjectName;
  unit: string;
  theme: string;
  category: MistakeCategory;
  source: string;
  reason: string;
  question: string;
  note: string;
  count: number;
  date: string;
  done: boolean;
}

// ── 日々の報告ノート ─────────────────────
export interface PlanItem { subject: SubjectName; material: string; done: boolean; }
export interface ReportNote {
  date: string;
  plan: PlanItem[];
  studyMinutes: Partial<Record<SubjectName, number>>;
  note: string;
}

// ── パイプライン出力（data.json）────────
export interface SubjectSummary {
  id: SubjectId; name: SubjectName; chart: string;
  progress: number; open: number; total: number;
}
export interface MaterialBreakdown {
  id: string; title: string; type: "book" | "serial";
  done: number; total: number; pct: number; sub: string; todayDone: number;
}
export interface SubjectStats {
  pct: number; doneQ: number; totalQ: number; remainQ: number;
  todayDone: number; materials: MaterialBreakdown[];
}
export interface CalendarDay { min: number | null; q: number; }
export interface CalendarPlanItem { subj: SubjectName; mat: string; color: string; }
export interface CalendarReport { done: boolean[]; note: string; }
export interface CalendarData {
  year: number; month: number; label: string; firstWeekday: number; today: number; goal: number;
  days: Record<number, CalendarDay>;
  monthBySubject: { name: SubjectName; min: number; q: number }[];
  plan: Record<number, CalendarPlanItem[]>;
  reports: Record<number, CalendarReport>;
}
export interface DashboardData {
  user: { name: string; grade: string; course: string };
  nextTest: { name: string; daysLeft: number };
  today: { progressPct: number; minutes: number; goalMinutes: number; reviewed: number; queued: number };
  streak: { current: number; best: number };
  calendar: CalendarData;
  history: number[];
  subjects: SubjectSummary[];
  categories: string[];
  texts: TextMaterial[];
  tests: TestNote[];
  reasons: string[];
  mistakes: MistakeNote[];
  stats: Record<SubjectId, SubjectStats>;
}

export const SUBJECT_COLORS: Record<SubjectName, string> = {
  "算数": "var(--chart-7)",
  "国語": "var(--chart-2)",
  "理科": "var(--chart-1)",
  "社会": "#A9763C",
};
export const SUBJECT_IDS: Record<SubjectName, SubjectId> = {
  "算数": "math", "国語": "jp", "理科": "sci", "社会": "soc",
};
