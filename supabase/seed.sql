-- =====================================================================
-- Seed catalogue for Hangeul Global Learning Center.
-- Run after schema.sql. Safe to re-run (upserts on slug).
-- Prices are placeholders — edit them to your real fees.
-- =====================================================================

insert into public.courses
  (slug, track, title_en, title_ko, summary_en, summary_ko, level,
   outcomes_en, outcomes_ko, duration_weeks, hours_per_week, price_bdt, price_usd, sort_order,
   description_en, description_ko)
values
  ('korean-beginner', 'korean',
   'Basic Korean (Hangeul to Conversation)', '기초 한국어 (한글부터 회화까지)',
   'Start from the Hangeul alphabet and reach confident everyday conversation.',
   '한글 자모부터 시작해 일상 회화까지 자신 있게.',
   'Beginner · A1–A2',
   array['Read and write Hangeul fluently','Introduce yourself, family and work','Handle shopping, directions and ordering food','~800 core vocabulary words','Present, past and future tense'],
   array['한글 읽기·쓰기 완성','자기소개·가족·직업 말하기','쇼핑·길찾기·주문 표현','핵심 어휘 약 800개','현재·과거·미래 시제'],
   12, 4.0, 6000, 60, 10,
   'Our foundation course. Three sessions a week, small groups, and a native-speaker conversation clinic every other Friday. No prior Korean needed — day one starts with ㄱ.',
   '기초 과정입니다. 주 3회 수업, 소규모 그룹, 격주 금요일 원어민 회화 클리닉. 사전 지식 불필요 — 첫날 ㄱ부터 시작합니다.'),

  ('topik-1', 'korean',
   'TOPIK I Preparation (Level 1–2)', 'TOPIK I 대비 (1~2급)',
   'Targeted drilling for the TOPIK I listening and reading papers.',
   'TOPIK I 듣기·읽기 집중 대비.',
   'TOPIK I · Level 1–2',
   array['Full listening and reading question-type coverage','Timed mock tests every week','Exam vocabulary and grammar lists','Answer-sheet and timing strategy','Target score: 140+ for Level 2'],
   array['듣기·읽기 전 유형 완전 정복','매주 실전 모의고사','시험 필수 어휘·문법','OMR 및 시간 배분 전략','목표 점수: 2급 140점 이상'],
   10, 6.0, 9000, 90, 20,
   'Built around past papers. You sit a timed mock every week and get a written breakdown of every wrong answer. Suitable after completing Basic Korean or equivalent.',
   '기출문제 중심 과정. 매주 실전 모의고사를 치르고 오답 전체에 대한 서면 분석을 받습니다. 기초 한국어 수료자 또는 동급자 대상.'),

  ('topik-2', 'korean',
   'TOPIK II Preparation (Level 3–6)', 'TOPIK II 대비 (3~6급)',
   'Listening, reading and the 쓰기 essay — including 51–54 writing drills.',
   '듣기·읽기·쓰기 (51~54번 작문 집중).',
   'TOPIK II · Level 3–6',
   array['Essay questions 51–54 with weekly marked writing','Advanced grammar patterns','Academic and news reading speed','Full-length mock exams','Target score: 190+ for Level 5'],
   array['51~54번 작문 매주 첨삭','고급 문법 패턴','학술·시사 지문 속독','실전 전체 모의고사','목표 점수: 5급 190점 이상'],
   14, 6.0, 13000, 130, 30,
   'The essay section decides most TOPIK II results, so you write every week and get it marked by hand. Includes EPS-TOPIK guidance for students heading to Korea for work.',
   '작문이 TOPIK II 결과를 좌우합니다. 매주 작문 후 직접 첨삭. 취업 목적 학생을 위한 EPS-TOPIK 안내 포함.'),

  ('english-foundation', 'english',
   'Basic English (Foundation & Spoken)', '기초 영어 (기초·회화)',
   'Grammar rebuilt from the ground up, plus daily speaking practice.',
   '문법 기초부터 다시, 매일 말하기 연습.',
   'Beginner–Intermediate · A1–B1',
   array['Core grammar: tenses, articles, prepositions','Everyday and workplace conversation','Pronunciation and fluency drills','Reading and listening comprehension','Confidence to speak without translating'],
   array['핵심 문법: 시제·관사·전치사','일상·직장 회화','발음 및 유창성 훈련','독해·청해','번역 없이 말하는 자신감'],
   12, 4.0, 5500, 55, 40,
   'For students who studied English at school but never became comfortable speaking it. Every class is at least half speaking practice.',
   '학교에서 영어를 배웠지만 말하기가 어려운 학생을 위한 과정. 매 수업의 절반 이상이 말하기 연습입니다.'),

  ('ielts-academic', 'english',
   'IELTS Preparation (Academic & General)', 'IELTS 대비 (Academic·General)',
   'All four modules, weekly full mock tests, marked writing and one-to-one speaking.',
   '4개 영역 전체, 주간 실전 모의고사, 라이팅 첨삭·1:1 스피킹.',
   'IELTS · Band 5.5 → 7.5',
   array['Writing Task 1 & 2 marked to the band descriptors','One-to-one speaking mocks with recorded feedback','Reading speed and skimming technique','Listening across all four sections','Full mock test every week under exam timing'],
   array['밴드 기준 라이팅 Task 1·2 첨삭','녹음 피드백 포함 1:1 스피킹 모의','읽기 속도·스키밍 기법','듣기 4개 섹션 전체','매주 실전 시간 전체 모의고사'],
   10, 8.0, 15000, 150, 50,
   'Band-focused, not topic-focused. You get a diagnostic test in week one, a target band, and a written progress report at weeks 5 and 10.',
   '주제가 아닌 밴드 중심 과정. 1주차 진단 테스트, 목표 밴드 설정, 5주·10주차 서면 성적 리포트 제공.')
on conflict (slug) do update set
  track = excluded.track,
  title_en = excluded.title_en,
  title_ko = excluded.title_ko,
  summary_en = excluded.summary_en,
  summary_ko = excluded.summary_ko,
  level = excluded.level,
  outcomes_en = excluded.outcomes_en,
  outcomes_ko = excluded.outcomes_ko,
  duration_weeks = excluded.duration_weeks,
  hours_per_week = excluded.hours_per_week,
  price_bdt = excluded.price_bdt,
  price_usd = excluded.price_usd,
  sort_order = excluded.sort_order,
  description_en = excluded.description_en,
  description_ko = excluded.description_ko;

-- ---------------------------------------------------------------------
-- One offline + one online batch per course, starting next month.
-- ---------------------------------------------------------------------
insert into public.batches (course_id, name, mode, start_date, schedule_text, room_or_link, seats_total)
select c.id, b.name, b.mode::delivery_mode, b.start_date, b.schedule_text, b.room_or_link, b.seats_total
from public.courses c
cross join (values
  ('Evening Batch — On Campus', 'offline', (date_trunc('month', now()) + interval '1 month')::date, 'Sat / Mon / Wed · 7:00–9:00 PM', 'HGLC Campus, Dhaka', 20),
  ('Online Batch — Live Zoom',  'online',  (date_trunc('month', now()) + interval '1 month' + interval '7 days')::date, 'Sun / Tue / Thu · 9:00–11:00 PM', 'Zoom link sent after enrolment', 30)
) as b(name, mode, start_date, schedule_text, room_or_link, seats_total)
where not exists (
  select 1 from public.batches x where x.course_id = c.id and x.name = b.name
);
