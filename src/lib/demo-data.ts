import type { Batch, Course } from "@/lib/types";

/**
 * Mirror of supabase/seed.sql, used only when Supabase is not configured so
 * the site can be browsed before the database exists. Enrolment, payment and
 * the dashboard stay disabled in this mode.
 */

function isoDate(monthsAhead: number, dayOffset = 0) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + monthsAhead);
  date.setDate(1 + dayOffset);
  return date.toISOString().slice(0, 10);
}

export const DEMO_COURSES: Course[] = [
  {
    id: "demo-korean-beginner",
    slug: "korean-beginner",
    track: "korean",
    title_en: "Basic Korean (Hangeul to Conversation)",
    title_ko: "기초 한국어 (한글부터 회화까지)",
    summary_en:
      "Start from the Hangeul alphabet and reach confident everyday conversation.",
    summary_ko: "한글 자모부터 시작해 일상 회화까지 자신 있게.",
    description_en:
      "Our foundation course. Three sessions a week, small groups, and a native-speaker conversation clinic every other Friday. No prior Korean needed — day one starts with ㄱ.",
    description_ko:
      "기초 과정입니다. 주 3회 수업, 소규모 그룹, 격주 금요일 원어민 회화 클리닉. 사전 지식 불필요 — 첫날 ㄱ부터 시작합니다.",
    level: "Beginner · A1–A2",
    outcomes_en: [
      "Read and write Hangeul fluently",
      "Introduce yourself, family and work",
      "Handle shopping, directions and ordering food",
      "~800 core vocabulary words",
      "Present, past and future tense",
    ],
    outcomes_ko: [
      "한글 읽기·쓰기 완성",
      "자기소개·가족·직업 말하기",
      "쇼핑·길찾기·주문 표현",
      "핵심 어휘 약 800개",
      "현재·과거·미래 시제",
    ],
    duration_weeks: 12,
    hours_per_week: 4,
    price_bdt: 6000,
    price_usd: 60,
    sort_order: 10,
    is_active: true,
  },
  {
    id: "demo-topik-1",
    slug: "topik-1",
    track: "korean",
    title_en: "TOPIK I Preparation (Level 1–2)",
    title_ko: "TOPIK I 대비 (1~2급)",
    summary_en: "Targeted drilling for the TOPIK I listening and reading papers.",
    summary_ko: "TOPIK I 듣기·읽기 집중 대비.",
    description_en:
      "Built around past papers. You sit a timed mock every week and get a written breakdown of every wrong answer. Suitable after completing Basic Korean or equivalent.",
    description_ko:
      "기출문제 중심 과정. 매주 실전 모의고사를 치르고 오답 전체에 대한 서면 분석을 받습니다. 기초 한국어 수료자 또는 동급자 대상.",
    level: "TOPIK I · Level 1–2",
    outcomes_en: [
      "Full listening and reading question-type coverage",
      "Timed mock tests every week",
      "Exam vocabulary and grammar lists",
      "Answer-sheet and timing strategy",
      "Target score: 140+ for Level 2",
    ],
    outcomes_ko: [
      "듣기·읽기 전 유형 완전 정복",
      "매주 실전 모의고사",
      "시험 필수 어휘·문법",
      "OMR 및 시간 배분 전략",
      "목표 점수: 2급 140점 이상",
    ],
    duration_weeks: 10,
    hours_per_week: 6,
    price_bdt: 9000,
    price_usd: 90,
    sort_order: 20,
    is_active: true,
  },
  {
    id: "demo-topik-2",
    slug: "topik-2",
    track: "korean",
    title_en: "TOPIK II Preparation (Level 3–6)",
    title_ko: "TOPIK II 대비 (3~6급)",
    summary_en:
      "Listening, reading and the 쓰기 essay — including 51–54 writing drills.",
    summary_ko: "듣기·읽기·쓰기 (51~54번 작문 집중).",
    description_en:
      "The essay section decides most TOPIK II results, so you write every week and get it marked by hand. Includes EPS-TOPIK guidance for students heading to Korea for work.",
    description_ko:
      "작문이 TOPIK II 결과를 좌우합니다. 매주 작문 후 직접 첨삭. 취업 목적 학생을 위한 EPS-TOPIK 안내 포함.",
    level: "TOPIK II · Level 3–6",
    outcomes_en: [
      "Essay questions 51–54 with weekly marked writing",
      "Advanced grammar patterns",
      "Academic and news reading speed",
      "Full-length mock exams",
      "Target score: 190+ for Level 5",
    ],
    outcomes_ko: [
      "51~54번 작문 매주 첨삭",
      "고급 문법 패턴",
      "학술·시사 지문 속독",
      "실전 전체 모의고사",
      "목표 점수: 5급 190점 이상",
    ],
    duration_weeks: 14,
    hours_per_week: 6,
    price_bdt: 13000,
    price_usd: 130,
    sort_order: 30,
    is_active: true,
  },
  {
    id: "demo-english-foundation",
    slug: "english-foundation",
    track: "english",
    title_en: "Basic English (Foundation & Spoken)",
    title_ko: "기초 영어 (기초·회화)",
    summary_en: "Grammar rebuilt from the ground up, plus daily speaking practice.",
    summary_ko: "문법 기초부터 다시, 매일 말하기 연습.",
    description_en:
      "For students who studied English at school but never became comfortable speaking it. Every class is at least half speaking practice.",
    description_ko:
      "학교에서 영어를 배웠지만 말하기가 어려운 학생을 위한 과정. 매 수업의 절반 이상이 말하기 연습입니다.",
    level: "Beginner–Intermediate · A1–B1",
    outcomes_en: [
      "Core grammar: tenses, articles, prepositions",
      "Everyday and workplace conversation",
      "Pronunciation and fluency drills",
      "Reading and listening comprehension",
      "Confidence to speak without translating",
    ],
    outcomes_ko: [
      "핵심 문법: 시제·관사·전치사",
      "일상·직장 회화",
      "발음 및 유창성 훈련",
      "독해·청해",
      "번역 없이 말하는 자신감",
    ],
    duration_weeks: 12,
    hours_per_week: 4,
    price_bdt: 5500,
    price_usd: 55,
    sort_order: 40,
    is_active: true,
  },
  {
    id: "demo-ielts-academic",
    slug: "ielts-academic",
    track: "english",
    title_en: "IELTS Preparation (Academic & General)",
    title_ko: "IELTS 대비 (Academic·General)",
    summary_en:
      "All four modules, weekly full mock tests, marked writing and one-to-one speaking.",
    summary_ko: "4개 영역 전체, 주간 실전 모의고사, 라이팅 첨삭·1:1 스피킹.",
    description_en:
      "Band-focused, not topic-focused. You get a diagnostic test in week one, a target band, and a written progress report at weeks 5 and 10.",
    description_ko:
      "주제가 아닌 밴드 중심 과정. 1주차 진단 테스트, 목표 밴드 설정, 5주·10주차 서면 성적 리포트 제공.",
    level: "IELTS · Band 5.5 → 7.5",
    outcomes_en: [
      "Writing Task 1 & 2 marked to the band descriptors",
      "One-to-one speaking mocks with recorded feedback",
      "Reading speed and skimming technique",
      "Listening across all four sections",
      "Full mock test every week under exam timing",
    ],
    outcomes_ko: [
      "밴드 기준 라이팅 Task 1·2 첨삭",
      "녹음 피드백 포함 1:1 스피킹 모의",
      "읽기 속도·스키밍 기법",
      "듣기 4개 섹션 전체",
      "매주 실전 시간 전체 모의고사",
    ],
    duration_weeks: 10,
    hours_per_week: 8,
    price_bdt: 15000,
    price_usd: 150,
    sort_order: 50,
    is_active: true,
  },
];

export function demoBatches(courseId: string): Batch[] {
  return [
    {
      id: `${courseId}-onsite`,
      course_id: courseId,
      name: "Evening Batch — On Campus",
      mode: "offline",
      start_date: isoDate(1),
      end_date: null,
      schedule_text: "Sat / Mon / Wed · 7:00–9:00 PM",
      room_or_link: "HGLC Campus, Dhaka",
      seats_total: 20,
      seats_taken: 12,
      is_open: true,
    },
    {
      id: `${courseId}-online`,
      course_id: courseId,
      name: "Online Batch — Live Zoom",
      mode: "online",
      start_date: isoDate(1, 7),
      end_date: null,
      schedule_text: "Sun / Tue / Thu · 9:00–11:00 PM",
      room_or_link: "Zoom link sent after enrolment",
      seats_total: 30,
      seats_taken: 9,
      is_open: true,
    },
  ];
}
