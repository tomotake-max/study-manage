/* Atelier Mucha — Kurumi study dashboard mock data (小学生 / 中学受験) */
window.MOCK = {
  user: { name: "くるみ", grade: "小学5年生", course: "中学受験コース" },

  // 次の公開テストまでのカウントダウン
  nextTest: { name: "7月度 公開テスト", daysLeft: 9 },

  today: { progressPct: 72, minutes: 84, goalMinutes: 120, reviewed: 7, queued: 5 },

  streak: { current: 9, best: 18 },

  // 学習カレンダー（当月・分単位／解いた問数）。min:0=お休み, null=未来
  calendar: {
    year: 2026, month: 6, label: "2026年 6月", firstWeekday: 1, today: 29, goal: 120,
    days: {
      1:{min:95,q:24}, 2:{min:60,q:14}, 3:{min:0,q:0}, 4:{min:110,q:28}, 5:{min:80,q:19},
      6:{min:130,q:33}, 7:{min:45,q:11}, 8:{min:70,q:17}, 9:{min:90,q:22}, 10:{min:0,q:0},
      11:{min:115,q:30}, 12:{min:60,q:15}, 13:{min:100,q:26}, 14:{min:84,q:20}, 15:{min:75,q:18},
      16:{min:0,q:0}, 17:{min:120,q:31}, 18:{min:95,q:23}, 19:{min:55,q:13}, 20:{min:0,q:0},
      21:{min:88,q:21}, 22:{min:70,q:17}, 23:{min:105,q:27}, 24:{min:60,q:15}, 25:{min:115,q:29},
      26:{min:90,q:22}, 27:{min:130,q:34}, 28:{min:75,q:18}, 29:{min:84,q:20}, 30:{min:null,q:0},
    },
    // 今月の科目別 学習量（分 / 問）
    monthBySubject: [
      { name: "算数", min: 880, q: 210 },
      { name: "国語", min: 460, q: 120 },
      { name: "理科", min: 480, q: 125 },
      { name: "社会", min: 381, q: 92  },
    ],
  },

  // last 14 days study minutes (for the bar strip)
  history: [50, 70, 30, 0, 90, 110, 60, 80, 20, 75, 100, 55, 120, 84],

  // ── 科目は4つだけ（算数・国語・理科・社会）────────────────
  subjects: [
    { id: "math", name: "算数", chart: "var(--chart-7)", progress: 64, open: 3, total: 28 },
    { id: "jp",   name: "国語", chart: "var(--chart-2)", progress: 78, open: 1, total: 22 },
    { id: "sci",  name: "理科", chart: "var(--chart-1)", progress: 52, open: 4, total: 24 },
    { id: "soc",  name: "社会", chart: "#A9763C", progress: 60, open: 2, total: 20 },
  ],

  // ── カテゴリ：テキスト と テスト（復習テスト・公開テスト）──────
  categories: ["テキスト", "復習テスト", "公開テスト"],

  // テキスト：科目 → 教材（テキスト名）→ テーマ（単元）→ 問数
  // type:"book" … テーマごとに問数 / type:"serial" … 日々の演習などの月刊（全○冊）
  texts: [
    { id: "ma-plus1", subject: "算数", title: "プラスワン問題集", publisher: "東京出版", type: "book", todayDone: 8,
      themes: [
        { name: "和差算・分配算", total: 10, done: 10 },
        { name: "つるかめ算",     total: 12, done: 12 },
        { name: "過不足算",       total: 10, done: 8  },
        { name: "差集め算",       total: 12, done: 6  },
        { name: "平均算",         total: 8,  done: 8  },
        { name: "消去算",         total: 10, done: 4  },
        { name: "年齢算",         total: 8,  done: 0  },
        { name: "速さの基本",     total: 14, done: 0  },
        { name: "旅人算",         total: 12, done: 0  },
        { name: "通過算",         total: 10, done: 0  },
        { name: "流水算",         total: 8,  done: 0  },
        { name: "時計算",         total: 8,  done: 0  },
        { name: "割合の基本",     total: 12, done: 0  },
        { name: "売買損益",       total: 10, done: 0  },
        { name: "食塩水",         total: 12, done: 0  },
        { name: "比と比例配分",   total: 12, done: 0  },
        { name: "平面図形",       total: 14, done: 0  },
        { name: "立体図形",       total: 12, done: 0  },
      ] },
    { id: "ma-hibi", subject: "算数", title: "日々の演習", publisher: "中学への算数（月刊）", type: "serial", todayDone: 6,
      volumesTotal: 30,
      current: { label: "6月号", unit: "速さと比", total: 32, done: 20 },
      // 各号の達成率（前年7月〜 / 100=完了, 0=未着手）
      volumes: [100,100,100,100,100,100,100,100,100,100,100, 62, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: "jp-kanji", subject: "国語", title: "漢字の要", publisher: "SAPIX", type: "book", todayDone: 5,
      themes: [
        { name: "ステージ1", total: 50, done: 50 },
        { name: "ステージ2", total: 50, done: 50 },
        { name: "ステージ3", total: 50, done: 38 },
        { name: "ステージ4", total: 50, done: 0  },
        { name: "ステージ5", total: 50, done: 0  },
      ] },
    { id: "sci-mc", subject: "理科", title: "メモリーチェック 理科", publisher: "日能研", type: "book", todayDone: 7,
      themes: [
        { name: "生物（植物）",        total: 24, done: 24 },
        { name: "生物（動物・昆虫）",  total: 22, done: 14 },
        { name: "地学（天体）",        total: 20, done: 6  },
        { name: "地学（気象）",        total: 18, done: 0  },
        { name: "物理（力・電気）",    total: 26, done: 0  },
        { name: "化学（水よう液）",    total: 20, done: 0  },
      ] },
    { id: "soc-cp", subject: "社会", title: "コアプラス 社会", publisher: "SAPIX", type: "book", todayDone: 4,
      themes: [
        { name: "地理（地形・気候）",  total: 40, done: 40 },
        { name: "地理（産業）",        total: 38, done: 22 },
        { name: "歴史（古代〜中世）",  total: 44, done: 10 },
        { name: "歴史（近世〜近代）",  total: 46, done: 0  },
        { name: "公民",                total: 30, done: 0  },
      ] },

    /* ── 修了済みの参考書（全問完了）───────────────── */
    { id: "ma-keisan", subject: "算数", title: "計算の特訓", publisher: "日能研", type: "book", todayDone: 0,
      themes: [ { name: "四則計算", total: 40, done: 40 }, { name: "逆算", total: 30, done: 30 }, { name: "単位換算", total: 20, done: 20 } ] },
    { id: "ma-kira", subject: "算数", title: "きらめき算数脳", publisher: "SAPIX", type: "book", todayDone: 0,
      themes: [ { name: "思考力パズル", total: 24, done: 24 } ] },
    { id: "jp-kotoba", subject: "国語", title: "ことば力1100", publisher: "日能研", type: "book", todayDone: 0,
      themes: [ { name: "語彙 1〜500", total: 50, done: 50 }, { name: "語彙 501〜1100", total: 60, done: 60 } ] },
    { id: "sci-kiso", subject: "理科", title: "基礎ドリル理科", publisher: "市販", type: "book", todayDone: 0,
      themes: [ { name: "てこ・ばね", total: 20, done: 20 }, { name: "電気", total: 20, done: 20 } ] },
    { id: "soc-chizu", subject: "社会", title: "白地図トレーニング", publisher: "市販", type: "book", todayDone: 0,
      themes: [ { name: "都道府県", total: 47, done: 47 } ] },
  ],

  // テスト：復習テスト（毎週）と 公開テスト（毎月・模試）
  tests: [
    { id: "rv-1", kind: "復習テスト", subject: "算数", name: "第18回 復習テスト", date: "6/21", range: "速さ・旅人算",       score: 82,  done: true  },
    { id: "rv-2", kind: "復習テスト", subject: "国語", name: "第18回 復習テスト", date: "6/21", range: "説明文・漢字",       score: 90,  done: true  },
    { id: "rv-3", kind: "復習テスト", subject: "理科", name: "第18回 復習テスト", date: "6/21", range: "水よう液",           score: 64,  done: false },
    { id: "rv-4", kind: "復習テスト", subject: "社会", name: "第17回 復習テスト", date: "6/14", range: "江戸時代",           score: 76,  done: true  },
    { id: "op-1", kind: "公開テスト", subject: "4科総合", name: "6月度 公開テスト", date: "6/8",  range: "5年 上 全範囲",      deviation: 58, subjectDev: { "算数": 55, "国語": 60, "理科": 57, "社会": 61 }, done: true  },
    { id: "op-2", kind: "公開テスト", subject: "4科総合", name: "5月度 公開テスト", date: "5/11", range: "5年 上 第1〜10回",   deviation: 55, subjectDev: { "算数": 52, "国語": 58, "理科": 54, "社会": 56 }, done: true  },
  ],

  // 間違いの理由（小学生向け）
  reasons: ["計算ミス", "問題の読みまちがい", "おぼえていない", "考え方のミス", "時間切れ", "うっかりミス"],

  mistakes: [
    { id: 1, subject: "算数", unit: "速さ",       theme: "追い越し",       q: "兄が弟を追い越すのにかかる時間", source: "速さテキスト p.32", category: "テキスト",   reason: "考え方のミス",     note: "追い越しは『差÷速さの差』。和で割ってしまった。", count: 3, date: "6/24", done: false },
    { id: 2, subject: "理科", unit: "昆虫",       theme: "育ち方",         q: "モンシロチョウの育つ順番", source: "理科テキスト 第3回", category: "テキスト",   reason: "おぼえていない", note: "たまご→よう虫→さなぎ→成虫。さなぎを抜かしてしまった。", count: 2, date: "6/24", done: true },
    { id: 3, subject: "算数", unit: "割合と比",   theme: "食塩水",         q: "食塩水の濃さを求める",       source: "第18回 復習テスト", category: "復習テスト", reason: "計算ミス",         note: "食塩÷食塩水で計算するところを、食塩÷水にしてしまった。", count: 4, date: "6/23", done: false },
    { id: 4, subject: "国語", unit: "説明文の読解", theme: "指示語",        q: "「それ」が指す内容を答える", source: "国語テキスト 第5回", category: "テキスト",   reason: "問題の読みまちがい", note: "直前の一文だけ見て答えた。前の段落まで読む。", count: 1, date: "6/22", done: false },
    { id: 5, subject: "理科", unit: "水よう液",   theme: "リトマス紙",     q: "酸性・アルカリ性の見分け方", source: "第18回 復習テスト", category: "復習テスト", reason: "おぼえていない", note: "赤→青がアルカリ性。逆におぼえていた。", count: 2, date: "6/22", done: false },
    { id: 6, subject: "社会", unit: "江戸時代",   theme: "三大改革",       q: "享保の改革を行った人物",     source: "公開テスト 6月度", category: "公開テスト", reason: "おぼえていない", note: "徳川吉宗。田沼意次と混同した。", count: 3, date: "6/8",  done: true  },
    { id: 7, subject: "算数", unit: "平面図形",   theme: "角度",           q: "外角を使った角度の計算",     source: "算数テキスト p.51", category: "テキスト",   reason: "考え方のミス",     note: "三角形の外角＝離れた2つの内角の和。", count: 2, date: "6/20", done: false },
  ],
};

/* 教材データ（texts）から科目ごとの問数進捗を集計する。
   問題集 … テーマの done/total を合計。
   日々の演習（serial）… 各号 current.total 問とみなし、達成率で問数換算。 */
window.subjectStats = function (subjectName) {
  const mats = window.MOCK.texts.filter((t) => t.subject === subjectName);
  let doneQ = 0, totalQ = 0;
  const breakdown = mats.map((mat) => {
    let d, t, pct, sub;
    if (mat.type === "serial") {
      const per = mat.current.total;
      t = mat.volumesTotal * per;
      d = Math.round(mat.volumes.reduce((a, v) => a + v, 0) / 100 * per);
      pct = Math.round((d / t) * 100);
      const doneVols = mat.volumes.filter((v) => v >= 100).length;
      sub = doneVols + "/" + mat.volumesTotal + "冊";
    } else {
      t = mat.themes.reduce((a, x) => a + x.total, 0);
      d = mat.themes.reduce((a, x) => a + x.done, 0);
      pct = Math.round((d / t) * 100);
      const doneT = mat.themes.filter((x) => x.done >= x.total).length;
      sub = doneT + "/" + mat.themes.length + "テーマ";
    }
    doneQ += d; totalQ += t;
    return { id: mat.id, title: mat.title, type: mat.type, done: d, total: t, pct, sub, todayDone: mat.todayDone };
  });
  return {
    pct: totalQ ? Math.round((doneQ / totalQ) * 100) : 0,
    doneQ, totalQ, remainQ: totalQ - doneQ,
    todayDone: mats.reduce((a, m) => a + (m.todayDone || 0), 0),
    materials: breakdown,
  };
};

/* ── 学習予定（その日にやること）と 報告 ─────────────────────
   曜日テンプレートから当月の予定を生成。日曜はお休み。
   今日より前で予定がある日は「報告ずみ」とする。 */
(function () {
  const cal = window.MOCK.calendar;
  const color = (name) => (window.MOCK.subjects.find((s) => s.name === name) || {}).chart || "var(--ink-faint)";
  // [科目, 教材]
  const tmpl = {
    0: [["算数", "プラスワン"], ["理科", "メモリーチェック"]],          // 月
    1: [["国語", "漢字の要"], ["算数", "日々の演習"]],                  // 火
    2: [["社会", "コアプラス"], ["算数", "プラスワン"]],                // 水
    3: [["理科", "メモリーチェック"], ["国語", "漢字の要"]],            // 木
    4: [["算数", "プラスワン"], ["社会", "Z会"]],                       // 金
    5: [["算数", "日々の演習"], ["国語", "漢字の要"], ["理科", "メモリーチェック"]], // 土
    6: [],                                                              // 日（お休み）
  };
  const daysInMonth = new Date(cal.year, cal.month, 0).getDate();
  cal.plan = {};
  cal.reports = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const idx = (d - 1 + ((cal.firstWeekday + 6) % 7)) % 7;
    const items = (tmpl[idx] || []).map((it) => ({ subj: it[0], mat: it[1], color: color(it[0]) }));
    cal.plan[d] = items;
    // 過去の予定日はほぼ報告ずみ（一部だけ未報告にして自然に）
    if (d < cal.today && items.length && d !== cal.today - 1) {
      cal.reports[d] = { done: items.map(() => true), note: "" };
    }
  }
})();
