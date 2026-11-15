/**
 * curriculum-system/manifest-system.js
 * SỔ CÁI MASTER TOÀN DIỆN (BAND 0.0 ➔ 7.5+)
 * TÍCH HỢP 100% KHO 60 BÀI ĐỌC SƯU TẦM & BÀI LUYỆN THEO KỸ NĂNG
 * BẢN FULL ĐẦY ĐỦ 100% - BẢO TOÀN NGUYÊN VẸN 858 ĐỐT SỐNG CŨ
 */

// =========================================================================
// 1. GIAI ĐOẠN 1: FOUNDATION (BAND 0.0 ➔ 3.5/4.0) - TỔNG: 67 ĐỐT
// =========================================================================
function generateStage1Nodes() {
  const nodes = [];

  // Ngữ pháp cơ bản (8 chuyên đề: Lý thuyết + Bài tập = 16 đốt)
  const basicGrammar = [
    { id: "nouns", title: "1. Danh từ số ít & số nhiều", durT: 10, durE: 15, tag: "G_NOUNS" },
    { id: "present-simple", title: "2. Hiện tại đơn", durT: 15, durE: 25, tag: "G_PRES_SIMPLE" },
    { id: "present-continuous", title: "3. Hiện tại tiếp diễn", durT: 12, durE: 20, tag: "G_PRES_CONT" },
    { id: "irregular-v2", title: "4. Động từ bất quy tắc V2", durT: 25, durE: 12, tag: "G_IRREG_V2" },
    { id: "past-simple", title: "5. Quá khứ đơn", durT: 20, durE: 25, tag: "G_PAST_SIMPLE" },
    { id: "simple-future", title: "6. Tương lai đơn", durT: 10, durE: 15, tag: "G_FUTURE_SIMPLE" },
    { id: "prepositions", title: "7. Giới từ cơ bản (In - On - At)", durT: 8, durE: 15, tag: "G_PREP_BASIC" },
    { id: "articles", title: "8. Mạo từ (A / An / The)", durT: 18, durE: 25, tag: "G_ARTICLES" }
  ];

  basicGrammar.forEach((g, idx) => {
    const num = String((idx + 1) * 2 - 1).padStart(2, '0');
    const numE = String((idx + 1) * 2).padStart(2, '0');
    nodes.push({
      id: `S1_GRAM_${num}`, stage: "S1", domain: "GRAMMAR", type: "THEORY",
      title: `${g.title} (Concept Lý thuyết)`,
      url: `grammar/lesson-g.html?tense=${g.id}&type=theory`,
      duration: { fast: Math.round(g.durT * 0.7), normal: g.durT, slow: Math.round(g.durT * 1.5) },
      coachHours: 0, tags: [g.tag]
    });
    nodes.push({
      id: `S1_GRAM_${numE}`, stage: "S1", domain: "GRAMMAR", type: "PRACTICE",
      title: `${g.title} (Bài tập thực hành)`,
      url: `grammar/lesson-g.html?tense=${g.id}&type=exercises`,
      duration: { fast: Math.round(g.durE * 0.7), normal: g.durE, slow: Math.round(g.durE * 1.5) },
      coachHours: 0.25, tags: [g.tag]
    });
  });

  // Từ vựng 300 từ (Unit 1 - 4: 4 đốt)
  for (let u = 1; u <= 4; u++) {
    nodes.push({
      id: `S1_VOCAB_${String(u).padStart(2, '0')}`, stage: "S1", domain: "VOCABULARY", type: "PRACTICE",
      title: `Từ vựng Học thuật Unit ${u} (Bộ 300 từ cơ bản)`,
      url: `vocab/index-v.html?unit=${u}`,
      duration: { fast: 15, normal: 25, slow: 40 }, coachHours: 0, tags: [`VOCAB_300_U${u}`]
    });
  }

  // Pre-Listening A1 (15 bài)
  for (let i = 1; i <= 15; i++) {
    nodes.push({
      id: `S1_PLIS_A1_${String(i).padStart(2, '0')}`, stage: "S1", domain: "PRE_LISTENING", type: "PRACTICE",
      title: `Pre-Listening A1: Luyện nghe số đếm, tên riêng & Bắt âm #${i}`,
      url: "pre-listening/index-pl.html",
      duration: { fast: 10, normal: 15, slow: 25 }, coachHours: 0, tags: ["PRE_LIS_A1"]
    });
  }

  // Pre-Reading A1 (10 bài)
  for (let i = 1; i <= 10; i++) {
    nodes.push({
      id: `S1_PREAD_A1_${String(i).padStart(2, '0')}`, stage: "S1", domain: "PRE_READING", type: "PRACTICE",
      title: `Pre-Reading A1: Kỹ thuật Scanning định vị từ khóa cơ bản #${i}`,
      url: "pre-reading/index-pr.html",
      duration: { fast: 10, normal: 15, slow: 25 }, coachHours: 0.25, tags: ["PRE_READ_A1"]
    });
  }

  // Pre-Speaking Shadowing A1 (22 bài giao tiếp đời sống)
  for (let i = 1; i <= 22; i++) {
    nodes.push({
      id: `S1_PSPK_A1_${String(i).padStart(2, '0')}`, stage: "S1", domain: "PRE_SPEAKING", type: "PRACTICE",
      title: `Pre-Speaking A1: Shadowing Giao tiếp đời sống hàng ngày #${i}`,
      url: "pre-speaking/index-ps.html",
      duration: { fast: 15, normal: 20, slow: 30 }, coachHours: 0.25, tags: ["PRE_SPK_A1"]
    });
  }

  return nodes;
}

// =========================================================================
// 2. GIAI ĐOẠN 2: PRE-IELTS (BAND 4.0 ➔ 5.5) - TỔNG: 173 ĐỐT
// =========================================================================
function generateStage2Nodes() {
  const nodes = [];

  // Ngữ pháp trung cấp (10 chuyên đề câu phức: Lý thuyết + Bài tập = 20 đốt)
  const interGrammar = [
    { id: "past-continuous", title: "9. Quá khứ tiếp diễn", durT: 15, durE: 20, tag: "G_PAST_CONT" },
    { id: "irregular-v3", title: "10. Động từ bất quy tắc V3", durT: 20, durE: 12, tag: "G_IRREG_V3" },
    { id: "present-perfect", title: "11. Hiện tại hoàn thành", durT: 20, durE: 30, tag: "G_PRES_PERF" },
    { id: "past-perfect", title: "12. Quá khứ hoàn thành", durT: 15, durE: 25, tag: "G_PAST_PERF" },
    { id: "conditionals", title: "13. Câu điều kiện IF (1, 2, 3)", durT: 30, durE: 35, tag: "G_CONDITIONALS" },
    { id: "passive-voice", title: "14. Câu bị động (Passive Voice)", durT: 20, durE: 35, tag: "G_PASSIVE_VOICE" },
    { id: "13-comparison", title: "15. Cấu trúc So sánh", durT: 20, durE: 25, tag: "G_COMPARISON" },
    { id: "14-relative-clauses", title: "16. Mệnh đề quan hệ", durT: 18, durE: 25, tag: "G_RELATIVE_CLAUSE" },
    { id: "prepositions-adv", title: "17. Giới từ nâng cao", durT: 25, durE: 45, tag: "G_PREP_ADV" },
    { id: "15-word-form", title: "18. Cấu tạo từ (Word Form)", durT: 30, durE: 35, tag: "G_WORD_FORM" }
  ];

  interGrammar.forEach((g, idx) => {
    const num = String((idx + 9) * 2 - 1).padStart(2, '0');
    const numE = String((idx + 9) * 2).padStart(2, '0');
    nodes.push({
      id: `S2_GRAM_${num}`, stage: "S2", domain: "GRAMMAR", type: "THEORY",
      title: `${g.title} (Lý thuyết)`,
      url: `grammar/lesson-g.html?tense=${g.id}&type=theory`,
      duration: { fast: Math.round(g.durT * 0.7), normal: g.durT, slow: Math.round(g.durT * 1.5) },
      coachHours: 0, tags: [g.tag]
    });
    nodes.push({
      id: `S2_GRAM_${numE}`, stage: "S2", domain: "GRAMMAR", type: "PRACTICE",
      title: `${g.title} (Bài tập)`,
      url: `grammar/lesson-g.html?tense=${g.id}&type=exercises`,
      duration: { fast: Math.round(g.durE * 0.7), normal: g.durE, slow: Math.round(g.durE * 1.5) },
      coachHours: 0.5, tags: [g.tag]
    });
  });

  // Từ vựng 300 từ (Unit 5 - 10: 6 đốt) & Bộ 540 từ (Unit 1 - 6: 6 đốt) = 12 đốt
  for (let u = 5; u <= 10; u++) {
    nodes.push({
      id: `S2_VOCAB_300_${String(u).padStart(2, '0')}`, stage: "S2", domain: "VOCABULARY", type: "PRACTICE",
      title: `Từ vựng Học thuật Unit ${u} (Bộ 300 từ)`,
      url: `vocab/index-v.html?unit=${u}`,
      duration: { fast: 15, normal: 25, slow: 40 }, coachHours: 0, tags: [`VOCAB_300_U${u}`]
    });
  }
  for (let u = 1; u <= 6; u++) {
    nodes.push({
      id: `S2_VOCAB_540_${String(u).padStart(2, '0')}`, stage: "S2", domain: "VOCABULARY", type: "PRACTICE",
      title: `Từ vựng Nâng cao Unit ${u} (Bộ 540 từ)`,
      url: `vocab/index-v.html?unit=${u + 10}`,
      duration: { fast: 15, normal: 25, slow: 40 }, coachHours: 0, tags: [`VOCAB_540_U${u}`]
    });
  }

  // Pre-Listening Level A2 & B1 (25 bài)
  for (let i = 1; i <= 25; i++) {
    nodes.push({
      id: `S2_PLIS_${String(i).padStart(2, '0')}`, stage: "S2", domain: "PRE_LISTENING", type: "PRACTICE",
      title: `Pre-Listening A2/B1: Nhận diện bẫy tự sửa ý & Bắt từ khóa #${i}`,
      url: "pre-listening/index-pl.html",
      duration: { fast: 10, normal: 15, slow: 25 }, coachHours: 0, tags: ["PRE_LIS_INTER"]
    });
  }

  // Pre-Reading Level A2 & B1 (20 bài)
  for (let i = 1; i <= 20; i++) {
    nodes.push({
      id: `S2_PREAD_${String(i).padStart(2, '0')}`, stage: "S2", domain: "PRE_READING", type: "PRACTICE",
      title: `Pre-Reading A2/B1: Kỹ thuật Sentence Stripping cởi trói câu phức #${i}`,
      url: "pre-reading/index-pr.html",
      duration: { fast: 10, normal: 15, slow: 25 }, coachHours: 0.25, tags: ["PRE_READ_INTER"]
    });
  }

  // Pre-Speaking Shadowing Level A2 & B1 (40 bài)
  for (let i = 1; i <= 40; i++) {
    nodes.push({
      id: `S2_PSPK_${String(i).padStart(2, '0')}`, stage: "S2", domain: "PRE_SPEAKING", type: "PRACTICE",
      title: `Pre-Speaking A2/B1: Shadowing Ngữ điệu & Phản xạ kéo dài câu #${i}`,
      url: "pre-speaking/index-ps.html",
      duration: { fast: 15, normal: 20, slow: 30 }, coachHours: 0.25, tags: ["PRE_SPK_INTER"]
    });
  }

  // ĐỦ 100% KHO PRE-WRITING TASK 1 (31 BÀI)
  const pwt1List = [
    "01-1-line-unemployment", "01-2-line-meat", "01-3-line-commuters",
    "02-1-bar-tourists", "02-2-bar-renewable", "02-3-bar-transport",
    "03-1-pie-spending", "03-2-pie-population", "03-3-pie-diets",
    "04-1-table-fairtrade", "04-2-table-waste", "04-3-table-cycling",
    "05-1-mixed-living-alone", "05-2-mixed-kolkata", "05-3-mixed-anthropology", "05-4-mixed-sunshine", "05-5-mixed-country-x", "05-6-mixed-cars",
    "06-1-map-school-2004", "06-2-map-nelson", "06-3-map-school-1985", "06-4-map-hunderstone",
    "07-1-floor-museum", "07-2-floor-library", "07-3-floor-classroom", "07-4-floor-conference", "07-5-floor-art-gallery",
    "08-1-process-honeybee", "08-2-process-weather", "08-3-process-bottles", "08-4-process-cocoa", "08-5-process-salmon"
  ];
  pwt1List.forEach((item, idx) => {
    nodes.push({
      id: `S2_PWT1_${String(idx + 1).padStart(2, '0')}`, stage: "S2", domain: "PRE_WRITING_T1", type: "PRACTICE",
      title: `Pre-Writing T1: Dịch câu số liệu 3 Band [${item}]`,
      url: "pre-writing/index-pwt1.html",
      duration: { fast: 15, normal: 20, slow: 35 }, coachHours: 0.5, tags: ["PWT1_CORE"]
    });
  });

  // ĐỦ 100% KHO PRE-WRITING TASK 2 (25 BÀI)
  const pwt2List = [
    "01-1-op-environment", "01-2-op-technology", "01-3-op-education", "01-4-op-tourism", "01-5-op-advertising",
    "02-1-dis-work-employment", "02-2-dis-media-news", "02-3-dis-health-diet", "02-4-dis-arts-culture", "02-5-dis-transport-infrastructure",
    "03-1-ad-rural-migration", "03-2-ad-urbanization", "03-3-ad-ecommerce", "03-4-ad-globalization", "03-5-ad-family-aging",
    "04-1-ps-housing-crime", "04-2-ps-consumerism-waste", "04-3-ps-traffic-congestion", "04-4-ps-higher-education-cost", "04-5-ps-modern-lifestyle-health",
    "05-1-dq-financial-literacy", "05-2-dq-child-gaming", "05-3-dq-fast-fashion", "05-4-dq-space-exploration", "05-5-dq-social-media-relationships"
  ];
  pwt2List.forEach((item, idx) => {
    nodes.push({
      id: `S2_PWT2_${String(idx + 1).padStart(2, '0')}`, stage: "S2", domain: "PRE_WRITING_T2", type: "PRACTICE",
      title: `Pre-Writing T2: Dịch câu luận điểm PEEL [${item}]`,
      url: "pre-writing/index-pwt2.html",
      duration: { fast: 20, normal: 30, slow: 45 }, coachHours: 0.5, tags: ["PWT2_CORE"]
    });
  });

  return nodes;
}

// =========================================================================
// HÀM TIỆN ÍCH TỰ ĐỘNG SINH KHO 60 BÀI ĐỌC SƯU TẦM & BÀI LUYỆN THEO KỸ NĂNG
// =========================================================================
function generateReadingCollectionAndSkillNodes() {
  const nodes = [];

  // Cấu hình thời lượng theo chỉ thị của Thầy
  const skillDuration = { fast: 15, normal: 20, slow: 30 };
  const fullP1Duration = { fast: 12, normal: 15, slow: 20 };
  const fullP2Duration = { fast: 15, normal: 18, slow: 25 };
  const fullP3Duration = { fast: 18, normal: 20, slow: 30 };

  // Danh mục phân bổ kỹ năng chuẩn từ reading/js-r/reading-subsystems.config.js
  const p2MatchInfo = [201, 203, 206, 209, 211, 214, 216, 219];
  const p2MatchFeatures = [201, 206, 211, 216];
  const p2SummaryComp = [201, 203, 206, 209, 211, 214, 216, 219];
  const p2SummaryBox = [202, 205, 207, 210, 212, 215, 217, 220];
  const p2NoteComp = [204, 208, 213, 218];
  const p2Ynng = [202, 205, 207, 210, 212, 215, 217, 220];
  const p2Tfng = [204, 208, 213, 218];
  const p2Mcq = [202, 205, 207, 210, 212, 215, 217, 220];
  const p2McqTwo = [203, 209, 214, 219];

  const p3SummaryBox = [302, 303, 304, 306, 308, 309, 311, 313, 314, 317, 318, 319];
  const p3MatchEndings = [301, 305, 307, 310, 312, 315, 316, 320];

  // 1. SINH 20 BÀI PASSAGE 1 (101 - 120)
  for (let i = 1; i <= 20; i++) {
    const code = 100 + i;
    const setId = String(i).padStart(2, '0');

    // A. Bài Full Passage 1 Sưu tầm
    nodes.push({
      id: `S3_READ_COLL_ST${code}`, stage: "S3", domain: "READING", type: "PRACTICE",
      title: `Reading Sưu Tầm: Bộ ${setId} - Passage 1 (Full 13 câu)`,
      url: `reading/runner-reading.html?test=data-r/collection/p1/st-${code}.json&set=${setId}`,
      duration: fullP1Duration, coachHours: 0.25,
      tags: ["READ_COLLECTION", "READ_P1", `SET_${setId}`, `ST_${code}`]
    });

    // B. Bài Luyện Kỹ Năng: NOTE_COMP
    nodes.push({
      id: `S3_SKILL_ST${code}_NOTE_COMP`, stage: "S3", domain: "READING", type: "PRACTICE",
      title: `Luyện Kỹ Năng: Note Completion (st-${code})`,
      url: `reading/runner-reading.html?test=data-r/collection/p1/st-${code}.json&skill=NOTE_COMP`,
      duration: skillDuration, coachHours: 0.25,
      tags: ["NOTE_COMP", "GAP FILL", "GAP_FILL", "READ_SKILL", `ST_${code}`]
    });

    // C. Bài Luyện Kỹ Năng: TFNG
    nodes.push({
      id: `S3_SKILL_ST${code}_TFNG`, stage: "S3", domain: "READING", type: "PRACTICE",
      title: `Luyện Kỹ Năng: True/False/Not Given (st-${code})`,
      url: `reading/runner-reading.html?test=data-r/collection/p1/st-${code}.json&skill=TFNG`,
      duration: skillDuration, coachHours: 0.25,
      tags: ["TFNG", "TRUE/FALSE/NOT GIVEN", "TRUE_FALSE_NOT_GIVEN", "READ_SKILL", `ST_${code}`]
    });
  }

  // 2. SINH 20 BÀI PASSAGE 2 (201 - 220)
  for (let i = 1; i <= 20; i++) {
    const code = 200 + i;
    const setId = String(i).padStart(2, '0');

    // A. Bài Full Passage 2 Sưu tầm
    nodes.push({
      id: `S3_READ_COLL_ST${code}`, stage: "S3", domain: "READING", type: "PRACTICE",
      title: `Reading Sưu Tầm: Bộ ${setId} - Passage 2 (Full 13 câu)`,
      url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&set=${setId}`,
      duration: fullP2Duration, coachHours: 0.25,
      tags: ["READ_COLLECTION", "READ_P2", `SET_${setId}`, `ST_${code}`]
    });

    // B. Các bài Kỹ Năng Passage 2 theo đúng phân bổ
    if (p2MatchInfo.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_MATCH_INFO`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Matching Information (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=MATCH_INFO`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["MATCH_INFO", "MATCHING INFORMATION", "MATCHING_INFORMATION", "READ_SKILL", `ST_${code}`]
      });
    }
    if (p2MatchFeatures.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_MATCH_FEATURES`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Matching Names / Features (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=MATCH_FEATURES`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["MATCH_FEATURES", "MATCHING NAMES", "MATCHING_NAMES", "READ_SKILL", `ST_${code}`]
      });
    }
    if (p2SummaryComp.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_SUMMARY_COMP`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Summary Completion (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=SUMMARY_COMP`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["SUMMARY_COMP", "GAP FILL", "GAP_FILL", "READ_SKILL", `ST_${code}`]
      });
    }
    if (p2SummaryBox.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_SUMMARY_BOX`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Summary Box Words (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=SUMMARY_BOX`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["SUMMARY_BOX", "GAP FILL", "GAP_FILL", "READ_SKILL", `ST_${code}`]
      });
    }
    if (p2NoteComp.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_NOTE_COMP`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Note Completion (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=NOTE_COMP`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["NOTE_COMP", "GAP FILL", "GAP_FILL", "READ_SKILL", `ST_${code}`]
      });
    }
    if (p2Ynng.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_YNNG`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Yes/No/Not Given (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=YNNG`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["YNNG", "YES/NO/NOT GIVEN", "YES_NO_NOT_GIVEN", "READ_SKILL", `ST_${code}`]
      });
    }
    if (p2Tfng.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_TFNG`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: True/False/Not Given (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=TFNG`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["TFNG", "TRUE/FALSE/NOT GIVEN", "TRUE_FALSE_NOT_GIVEN", "READ_SKILL", `ST_${code}`]
      });
    }
    if (p2Mcq.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_MCQ`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Multiple Choice 1 Answer (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=MCQ`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["MCQ", "MULTIPLE CHOICES 1 ANSWER", "MULTIPLE_CHOICE", "READ_SKILL", `ST_${code}`]
      });
    }
    if (p2McqTwo.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_MCQ_TWO`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Multiple Choice 2 Answers (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p2/st-${code}.json&skill=MCQ_TWO`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["MCQ_TWO", "MULTIPLE CHOICES 2 ANSWERS", "MULTIPLE_CHOICE_TWO", "READ_SKILL", `ST_${code}`]
      });
    }
  }

  // 3. SINH 20 BÀI PASSAGE 3 (301 - 320)
  for (let i = 1; i <= 20; i++) {
    const code = 300 + i;
    const setId = String(i).padStart(2, '0');

    // A. Bài Full Passage 3 Sưu tầm
    nodes.push({
      id: `S3_READ_COLL_ST${code}`, stage: "S3", domain: "READING", type: "PRACTICE",
      title: `Reading Sưu Tầm: Bộ ${setId} - Passage 3 (Full 14 câu)`,
      url: `reading/runner-reading.html?test=data-r/collection/p3/st-${code}.json&set=${setId}`,
      duration: fullP3Duration, coachHours: 0.5,
      tags: ["READ_COLLECTION", "READ_P3", `SET_${setId}`, `ST_${code}`]
    });

    // B. Kỹ năng MCQ (Tất cả 20 bài P3 đều có)
    nodes.push({
      id: `S3_SKILL_ST${code}_MCQ`, stage: "S3", domain: "READING", type: "PRACTICE",
      title: `Luyện Kỹ Năng: Multiple Choice 1 Answer (st-${code})`,
      url: `reading/runner-reading.html?test=data-r/collection/p3/st-${code}.json&skill=MCQ`,
      duration: skillDuration, coachHours: 0.25,
      tags: ["MCQ", "MULTIPLE CHOICES 1 ANSWER", "MULTIPLE_CHOICE", "READ_SKILL", `ST_${code}`]
    });

    // C. Kỹ năng YNNG (Tất cả 20 bài P3 đều có)
    nodes.push({
      id: `S3_SKILL_ST${code}_YNNG`, stage: "S3", domain: "READING", type: "PRACTICE",
      title: `Luyện Kỹ Năng: Yes/No/Not Given (st-${code})`,
      url: `reading/runner-reading.html?test=data-r/collection/p3/st-${code}.json&skill=YNNG`,
      duration: skillDuration, coachHours: 0.25,
      tags: ["YNNG", "YES/NO/NOT GIVEN", "YES_NO_NOT_GIVEN", "READ_SKILL", `ST_${code}`]
    });

    // D. Kỹ năng SUMMARY_BOX (12 bài P3)
    if (p3SummaryBox.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_SUMMARY_BOX`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Summary Box Words (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p3/st-${code}.json&skill=SUMMARY_BOX`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["SUMMARY_BOX", "GAP FILL", "GAP_FILL", "READ_SKILL", `ST_${code}`]
      });
    }

    // E. Kỹ năng MATCH_ENDINGS (8 bài P3)
    if (p3MatchEndings.includes(code)) {
      nodes.push({
        id: `S3_SKILL_ST${code}_MATCH_ENDINGS`, stage: "S3", domain: "READING", type: "PRACTICE",
        title: `Luyện Kỹ Năng: Matching Sentence Endings (st-${code})`,
        url: `reading/runner-reading.html?test=data-r/collection/p3/st-${code}.json&skill=MATCH_ENDINGS`,
        duration: skillDuration, coachHours: 0.25,
        tags: ["MATCH_ENDINGS", "MATCHING_ENDINGS", "READ_SKILL", `ST_${code}`]
      });
    }
  }

  return nodes;
}

// =========================================================================
// 3. GIAI ĐOẠN 3: IELTS SKILLS (BAND 5.5 ➔ 6.5) - TỔNG: 334 ĐỐT CŨ + BÀI MỚI
// =========================================================================
function generateStage3Nodes() {
  const nodes = [];

  // TÍCH HỢP TOÀN BỘ 60 BÀI ĐỌC SƯU TẦM & BÀI KỸ NĂNG MỚI LÊN ĐẦU
  nodes.push(...generateReadingCollectionAndSkillNodes());

  // Reading Cam 17, 18, 19 (Có mớm từ khóa: 3 cams * 4 tests * 3 passages = 36 bài)
  [17, 18, 19].forEach(cam => {
    for (let test = 1; test <= 4; test++) {
      for (let p = 1; p <= 3; p++) {
        nodes.push({
          id: `S3_READ_CAM${cam}_T${test}_P${p}`, stage: "S3", domain: "READING", type: "PRACTICE",
          title: `Reading Cam ${cam} Test ${test} - Passage ${p} (Có mớm từ khóa)`,
          url: `reading/runner-reading.html?test=data-r/cam${cam}-test${test}/cam${cam}-test${test}-p${p}.json`,
          duration: p === 1 ? { fast: 12, normal: 15, slow: 20 } : (p === 2 ? { fast: 15, normal: 18, slow: 25 } : { fast: 18, normal: 20, slow: 30 }),
          coachHours: p === 3 ? 0.5 : 0.25, tags: [`READ_CAM${cam}`, `READ_P${p}`, "READ_PROMPTED"]
        });
      }
    }
  });

  // Listening Cam 19, 20 (Có mớm: 2 cams * 4 tests * 4 parts = 32 bài)
  [19, 20].forEach(cam => {
    for (let test = 1; test <= 4; test++) {
      for (let p = 1; p <= 4; p++) {
        nodes.push({
          id: `S3_LIS_CAM${cam}_T${test}_P${p}`, stage: "S3", domain: "LISTENING", type: "PRACTICE",
          title: `Listening Cam ${cam} Test ${test} - Part ${p} (Có mớm dự đoán loại từ)`,
          url: `listening/runner-listening.html?test=cam${cam}-lis-test${test}-p${p}`,
          duration: (p === 1 || p === 2) ? { fast: 8, normal: 10, slow: 15 } : { fast: 10, normal: 12, slow: 18 },
          coachHours: p === 4 ? 0.5 : 0.25, tags: [`LIS_CAM${cam}`, `LIS_P${p}`, "LIS_PROMPTED"]
        });
      }
    }
  });

  // Từ vựng Nâng cao 540 từ (Unit 7 - 18: 12 đốt)
  for (let u = 7; u <= 18; u++) {
    nodes.push({
      id: `S3_VOCAB_540_${String(u).padStart(2, '0')}`, stage: "S3", domain: "VOCABULARY", type: "PRACTICE",
      title: `Từ vựng Nâng cao Unit ${u} (Bộ 540 từ Chuyên ngành)`,
      url: `vocab/index-v.html?unit=${u + 10}`,
      duration: { fast: 15, normal: 25, slow: 40 }, coachHours: 0, tags: [`VOCAB_540_U${u}`]
    });
  }

  // Pre-Listening Level B2 & C1 (30 bài)
  for (let i = 1; i <= 30; i++) {
    nodes.push({
      id: `S3_PLIS_B2C1_${String(i).padStart(2, '0')}`, stage: "S3", domain: "PRE_LISTENING", type: "PRACTICE",
      title: `Pre-Listening B2/C1: Bắt nhịp bài nói dài & Ghi chép luận điểm #${i}`,
      url: "pre-listening/index-pl.html",
      duration: { fast: 10, normal: 15, slow: 25 }, coachHours: 0, tags: ["PRE_LIS_ADV"]
    });
  }

  // Pre-Reading Level B2 & C1 (20 bài)
  for (let i = 1; i <= 20; i++) {
    nodes.push({
      id: `S3_PREAD_B2C1_${String(i).padStart(2, '0')}`, stage: "S3", domain: "PRE_READING", type: "PRACTICE",
      title: `Pre-Reading B2/C1: Quét câu chủ đề Topic Sentence bài báo quốc tế #${i}`,
      url: "pre-reading/index-pr.html",
      duration: { fast: 10, normal: 15, slow: 25 }, coachHours: 0.25, tags: ["PRE_READ_ADV"]
    });
  }

  // Pre-Speaking Shadowing Level B2 & B2.2 (40 bài)
  for (let i = 1; i <= 40; i++) {
    nodes.push({
      id: `S3_PSPK_B2_${String(i).padStart(2, '0')}`, stage: "S3", domain: "PRE_SPEAKING", type: "PRACTICE",
      title: `Pre-Speaking B2.2: Shadowing Tư duy tâm lý & Đàm phán #${i}`,
      url: "pre-speaking/index-ps.html",
      duration: { fast: 15, normal: 20, slow: 30 }, coachHours: 0.25, tags: ["PRE_SPK_B2"]
    });
  }

  // Writing Task 1 Cơ bản (60 đề đầu: Line, Bar, Table, Pie, Mixed)
  for (let i = 1; i <= 60; i++) {
    nodes.push({
      id: `S3_WT1_${String(i).padStart(2, '0')}`, stage: "S3", domain: "WRITING_T1", type: "PRACTICE",
      title: `Writing Task 1 Thực chiến: Đề #${i} (Viết 150 từ & Chấm 2 tầng)`,
      url: "writing task 1/index-t1.html",
      duration: { fast: 20, normal: 30, slow: 40 }, coachHours: 0.75, tags: ["WT1_STAGE3"]
    });
  }

  // Writing Task 2 Cơ bản (60 đề đầu: Opinion, Discussion)
  for (let i = 1; i <= 60; i++) {
    nodes.push({
      id: `S3_WT2_${String(i).padStart(2, '0')}`, stage: "S3", domain: "WRITING_T2", type: "PRACTICE",
      title: `Writing Task 2 Thực chiến: Đề #${i} (Viết luận 250 từ chuẩn PEEL)`,
      url: "writing task 2/index-t2.html",
      duration: { fast: 40, normal: 50, slow: 65 }, coachHours: 1.0, tags: ["WT2_STAGE3"]
    });
  }

  // Speaking Part 1 (24 topics) & Part 2 (20 cue cards) = 44 đốt
  for (let i = 1; i <= 24; i++) {
    nodes.push({
      id: `S3_SPK_P1_${String(i).padStart(2, '0')}`, stage: "S3", domain: "SPEAKING", type: "PRACTICE",
      title: `Speaking Part 1 Forecast: Topic #${i} (Phản xạ AREA)`,
      url: "speaking/index-s.html",
      duration: { fast: 10, normal: 15, slow: 20 }, coachHours: 0.25, tags: ["SPK_P1"]
    });
  }
  for (let i = 1; i <= 20; i++) {
    nodes.push({
      id: `S3_SPK_P2_${String(i).padStart(2, '0')}`, stage: "S3", domain: "SPEAKING", type: "PRACTICE",
      title: `Speaking Part 2 Forecast: Cue Card #${i} (Dàn ý 1p & Nói 2p)`,
      url: "speaking/index-s.html",
      duration: { fast: 15, normal: 20, slow: 30 }, coachHours: 0.5, tags: ["SPK_P2"]
    });
  }

  return nodes;
}

// =========================================================================
// 4. GIAI ĐOẠN 4: ADVANCED MASTERY (BAND 6.5 ➔ 7.5+) - TỔNG: 284 ĐỐT
// =========================================================================
function generateStage4Nodes() {
  const nodes = [];

  // Reading Cam 20 & 21 (Không mớm, bấm giờ thi thật: 7 tests * 3 passages = 21 bài)
  [20, 21].forEach(cam => {
    const tests = cam === 21 ? [1, 3, 4] : [1, 2, 3, 4];
    tests.forEach(test => {
      for (let p = 1; p <= 3; p++) {
        nodes.push({
          id: `S4_READ_CAM${cam}_T${test}_P${p}`, stage: "S4", domain: "READING", type: "TEST",
          title: `Reading Cam ${cam} Test ${test} - Passage ${p} (Tự làm KHÔNG MỚM - 15-20p)`,
          url: `reading/runner-reading.html?test=data-r/cam${cam}-test${test}/cam${cam}-test${test}-p${p}.json`,
          duration: { fast: 15, normal: 18, slow: 25 }, coachHours: 0.5, tags: ["READ_UNPROMPTED"]
        });
      }
    });
  });

  // Listening Cam 21 (Tốc độ 1.1x & Không dừng băng: 16 bài)
  for (let test = 1; test <= 4; test++) {
    for (let p = 1; p <= 4; p++) {
      nodes.push({
        id: `S4_LIS_CAM21_T${test}_P${p}`, stage: "S4", domain: "LISTENING", type: "TEST",
        title: `Listening Cam 21 Test ${test} - Part ${p} (Tốc độ 1.1x - Băng không dừng)`,
        url: `listening/runner-listening.html?test=cam21-lis-test${test}-p${p}`,
        duration: { fast: 10, normal: 12, slow: 18 }, coachHours: 0.5, tags: ["LIS_UNPROMPTED"]
      });
    }
  }

  // Writing Task 1 Nâng cao (73 đề còn lại: Map, Floor, Process, Mixed)
  for (let i = 61; i <= 133; i++) {
    nodes.push({
      id: `S4_WT1_${String(i).padStart(3, '0')}`, stage: "S4", domain: "WRITING_T1", type: "PRACTICE",
      title: `Writing Task 1 Chuyên sâu: Đề #${i} (Map/Process/Floor - Chuẩn 20p)`,
      url: "writing task 1/index-t1.html",
      duration: { fast: 20, normal: 30, slow: 40 }, coachHours: 0.75, tags: ["WT1_STAGE4"]
    });
  }

  // Writing Task 2 Nâng cao (56 đề còn lại: Outweigh, Cause-Solution, Two-part)
  for (let i = 61; i <= 116; i++) {
    nodes.push({
      id: `S4_WT2_${String(i).padStart(3, '0')}`, stage: "S4", domain: "WRITING_T2", type: "PRACTICE",
      title: `Writing Task 2 Đỉnh cao: Đề #${i} (Outweigh / Two-part - Chuẩn 40p)`,
      url: "writing task 2/index-t2.html",
      duration: { fast: 40, normal: 50, slow: 60 }, coachHours: 1.0, tags: ["WT2_STAGE4"]
    });
  }

  // Speaking Part 2 còn lại (16 cue cards) & Part 3 (36 deep discussion sets) = 52 đốt
  for (let i = 21; i <= 36; i++) {
    nodes.push({
      id: `S4_SPK_P2_${String(i).padStart(2, '0')}`, stage: "S4", domain: "SPEAKING", type: "PRACTICE",
      title: `Speaking Part 2 Thử thách: Cue Card #${i} (Nói 2 phút dưới áp lực)`,
      url: "speaking/index-s.html",
      duration: { fast: 15, normal: 20, slow: 30 }, coachHours: 0.5, tags: ["SPK_P2"]
    });
  }
  for (let i = 1; i <= 36; i++) {
    nodes.push({
      id: `S4_SPK_P3_${String(i).padStart(2, '0')}`, stage: "S4", domain: "SPEAKING", type: "PRACTICE",
      title: `Speaking Part 3 Phản biện: Topic #${i} (Framework 4 bước PEEL)`,
      url: "speaking/index-s.html",
      duration: { fast: 15, normal: 20, slow: 30 }, coachHours: 0.5, tags: ["SPK_P3"]
    });
  }

  // Pre-Speaking Shadowing Level C1 (54 bài Celebs & Phim Hollywood)
  for (let i = 1; i <= 54; i++) {
    nodes.push({
      id: `S4_PSPK_C1_${String(i).padStart(2, '0')}`, stage: "S4", domain: "PRE_SPEAKING", type: "PRACTICE",
      title: `Pre-Speaking C1: Shadowing Diễn thuyết & Phim Hollywood #${i}`,
      url: "pre-speaking/index-ps.html",
      duration: { fast: 15, normal: 25, slow: 35 }, coachHours: 0.25, tags: ["PRE_SPK_C1"]
    });
  }

  // 12 Đề Full Mock Test Tổng duyệt
  for (let i = 1; i <= 12; i++) {
    nodes.push({
      id: `S4_MOCK_TEST_${String(i).padStart(2, '0')}`, stage: "S4", domain: "MOCK_TEST", type: "TEST",
      title: `Full Mock Test #${i}: Đề thi thử áp lực phòng thi 3 tiếng`,
      url: "reading/runner-reading.html?test=cam21-test1-full",
      duration: { fast: 120, normal: 150, slow: 180 }, coachHours: 2.0, tags: ["MOCK_TEST_FULL"]
    });
  }

  return nodes;
}

// =========================================================================
// TỔNG HỢP TOÀN BỘ CHUỖI ĐỐT SỐNG MASTER VÀO 1 MẢNG DUY NHẤT
// =========================================================================
export const MASTER_CURRICULUM_SYSTEM = [
  ...generateStage1Nodes(), // 67 đốt
  ...generateStage2Nodes(), // 173 đốt
  ...generateStage3Nodes(), // 334 đốt cũ + Toàn bộ 60 bài Sưu tầm & Bài Luyện Kỹ năng mới
  ...generateStage4Nodes()  // 284 đốt
];

// Các hàm tiện ích tra cứu
export function getNodeById(nodeId) {
  return MASTER_CURRICULUM_SYSTEM.find(n => n.id === nodeId) || null;
}

export function getNodesByStage(stage) {
  return MASTER_CURRICULUM_SYSTEM.filter(n => n.stage === stage);
}

export function getNodesByDomain(domain) {
  return MASTER_CURRICULUM_SYSTEM.filter(n => n.domain === domain);
}

export function getMasterCurriculumStats() {
  return {
    totalNodes: MASTER_CURRICULUM_SYSTEM.length,
    stages: {
      S1: MASTER_CURRICULUM_SYSTEM.filter(n => n.stage === 'S1').length,
      S2: MASTER_CURRICULUM_SYSTEM.filter(n => n.stage === 'S2').length,
      S3: MASTER_CURRICULUM_SYSTEM.filter(n => n.stage === 'S3').length,
      S4: MASTER_CURRICULUM_SYSTEM.filter(n => n.stage === 'S4').length
    }
  };
}
