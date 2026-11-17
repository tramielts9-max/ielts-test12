/**
 * curriculum-system/ai-service-system.js
 * DỊCH VỤ AI GEMINI CHẨN ĐOÁN LỘ TRÌNH & ĐIỀU PHỐI ĐỐT SỐNG (MASTER PROMPT PHIÊN BẢN ĐỈNH CAO)
 * ĐÃ TÍCH HỢP TRỌN GÓI HỒ SƠ ONBOARDING INTAKE 11 CÂU HỎI & LUẬT 6 KHÓA CHẾT BAND
 * - LUẬT 6 BẮT BUỘC: Khóa chết Start Band và Target Band theo hồ sơ học sinh (Cấm AI tự đoán lại)
 * - KÊ ĐƠN ĐẶC TRỊ: Phân tích sâu sắc kỹ năng sợ nhất, tiền sử điểm thi cũ L-R-W-S và học lực trường
 * - BẬT CHẾ ĐỘ STRUCTURED JSON MODE: responseMimeType: "application/json" & maxOutputTokens: 4096
 * - TÍCH HỢP BỘ LỌC EXTRACT VÀ BẢN DỰ PHÒNG AN TOÀN TUYỆT ĐỐI (ZERO-CRASH FALLBACK)
 * - TÍCH HỢP KHO 60 BÀI READING SƯU TẦM 101-320 CHIA THEO 10 DẠNG KỸ NĂNG & CHIẾN LƯỢC PHÂN BỔ
 */

// 1. MÃ HÓA KEY THEO ĐÚNG QUY LUẬT CỦA API-T1.JS
const _RAW_KEY_PREFIX = "AQ.Ab8RN6KGTRGy";
const _RAW_KEY_SUFFIX = "SZoGpqs3vT-ikWDLUSWjloCCVlzZhAQque_34w";

export function getApiKey() {
  return `${_RAW_KEY_PREFIX}${_RAW_KEY_SUFFIX}`;
}

// 2. DANH SÁCH MODEL THEO THỨ TỰ ƯU TIÊN VÀ TỰ ĐỘNG RETRY
const ACTIVE_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash'
];

const VALID_READING_SKILL_TAGS = [
  'NOTE_COMP',
  'TFNG',
  'YNNG',
  'SUMMARY_COMP',
  'SUMMARY_BOX',
  'MATCH_INFO',
  'MATCH_FEATURES',
  'MATCH_ENDINGS',
  'MCQ',
  'MCQ_TWO'
];

/**
 * CHUẨN HÓA TAG DẠNG BÀI READING TỪ OUTPUT AI HOẶC TEXT ĐẦU VÀO
 */
function normalizeReadingSkillTag(rawTag = '') {
  const s = String(rawTag || '').trim().toUpperCase();
  if (!s) return '';
  if (VALID_READING_SKILL_TAGS.includes(s)) return s;
  if (s.includes('TFNG') || s.includes('TRUE/FALSE') || s.includes('TRUE FALSE') || s.includes('T/F/NG')) return 'TFNG';
  if (s.includes('YNNG') || s.includes('YES/NO') || s.includes('YES NO') || s.includes('Y/N/NG')) return 'YNNG';
  if (s.includes('SUMMARY_BOX') || s.includes('SUMMARY BOX') || s.includes('WORD BOX')) return 'SUMMARY_BOX';
  if (s.includes('SUMMARY')) return 'SUMMARY_COMP';
  if (s.includes('NOTE')) return 'NOTE_COMP';
  if (s.includes('MATCH_INFO') || s.includes('MATCHING INFO')) return 'MATCH_INFO';
  if (s.includes('MATCH_FEATURES') || s.includes('MATCHING NAMES') || s.includes('MATCHING FEATURES')) return 'MATCH_FEATURES';
  if (s.includes('MATCH_ENDINGS') || s.includes('SENTENCE ENDINGS') || s.includes('MATCHING ENDINGS')) return 'MATCH_ENDINGS';
  if (s.includes('MCQ_TWO') || s.includes('2 ANSWERS') || s.includes('TWO ANSWERS')) return 'MCQ_TWO';
  if (s.includes('MCQ') || s.includes('MULTIPLE CHOICE')) return 'MCQ';
  return '';
}

function inferReadingSkillsFromText(studentInputText = '', startBand = 4.5) {
  const text = String(studentInputText || '').toUpperCase();
  const detected = [];
  if (text.includes('TFNG') || text.includes('TRUE/FALSE') || text.includes('TRUE FALSE')) detected.push('TFNG');
  if (text.includes('YNNG') || text.includes('YES/NO') || text.includes('YES NO')) detected.push('YNNG');
  if (text.includes('NOTE') || text.includes('GAP FILL') || text.includes('GAP-FILL') || text.includes('ĐIỀN TỪ')) detected.push('NOTE_COMP');
  if (text.includes('SUMMARY BOX') || text.includes('WORD BOX')) detected.push('SUMMARY_BOX');
  else if (text.includes('SUMMARY')) detected.push('SUMMARY_COMP');
  if (text.includes('MATCHING INFO') || text.includes('MATCH_INFO') || text.includes('NỐI ĐOẠN')) detected.push('MATCH_INFO');
  if (text.includes('MATCHING NAMES') || text.includes('MATCHING FEATURES') || text.includes('MATCH_FEATURES')) detected.push('MATCH_FEATURES');
  if (text.includes('ENDINGS') || text.includes('NỐI VẾ')) detected.push('MATCH_ENDINGS');
  if (text.includes('2 ANSWERS') || text.includes('TWO ANSWERS') || text.includes('CHỌN 2')) detected.push('MCQ_TWO');
  if (text.includes('MCQ') || text.includes('MULTIPLE CHOICE') || text.includes('TRẮC NGHIỆM')) detected.push('MCQ');

  if (detected.length > 0) return Array.from(new Set(detected));
  if (startBand < 5.0) return ['NOTE_COMP', 'TFNG', 'MATCH_INFO', 'SUMMARY_COMP'];
  if (startBand < 6.0) return ['TFNG', 'MATCH_INFO', 'SUMMARY_BOX', 'YNNG', 'MCQ'];
  return ['MATCH_INFO', 'YNNG', 'SUMMARY_BOX', 'MATCH_ENDINGS', 'MCQ'];
}

function sanitizeSafeText(str = '') {
  return String(str || '').replace(/[\r\n]+/g, ' ').replace(/['"]/g, '').trim();
}

/**
 * CHUẨN HÓA KẾT QUẢ JSON TỪ GEMINI ĐẢM BẢO KHÓA CHẶT START BAND VÀ TARGET BAND
 */
function normalizeAIDiagnosticResult(parsed, studentInputText = '') {
  const fallback = createEmergencyFallback(studentInputText);
  const res = (parsed && typeof parsed === 'object') ? { ...fallback, ...parsed } : { ...fallback };

  // 🔴 KHÓA CHẶT START BAND: Ưu tiên số 1 lấy từ text đầu vào thay vì để AI tự ý thay đổi
  const textStartMatch = String(studentInputText || '').match(/Start\s*Band[:\s]*([0-9.]+)/i);
  if (textStartMatch && parseFloat(textStartMatch[1]) > 0) {
    res.estimated_band = parseFloat(textStartMatch[1]);
  } else {
    const sBand = parseFloat(res.estimated_band);
    res.estimated_band = !isNaN(sBand) && sBand > 0 ? sBand : fallback.estimated_band;
  }

  // 🔴 KHÓA CHẶT TARGET BAND: Ưu tiên số 1 lấy từ text đầu vào
  const textTargetMatch = String(studentInputText || '').match(/Target\s*Band[:\s]*([0-9.]+)/i);
  if (textTargetMatch && parseFloat(textTargetMatch[1]) > 0) {
    res.target_band = Math.min(7.5, parseFloat(textTargetMatch[1]));
  } else {
    const tBand = parseFloat(res.target_band);
    res.target_band = !isNaN(tBand) && tBand > 0 ? Math.min(7.5, tBand) : fallback.target_band;
  }

  const rawFocusSkills = Array.isArray(res.reading_focus_skills) ? res.reading_focus_skills : [];
  const normalizedFocus = rawFocusSkills.map(normalizeReadingSkillTag).filter(Boolean);
  const weakExtracted = [...(res.retained_weak_tags || []), ...(res.weak_tags || [])]
    .map(normalizeReadingSkillTag)
    .filter(Boolean);

  res.reading_focus_skills = Array.from(new Set(
    normalizedFocus.length > 0
      ? normalizedFocus
      : (weakExtracted.length > 0 ? weakExtracted : inferReadingSkillsFromText(studentInputText, res.estimated_band))
  ));

  const validStrategies = ['SKILL_FIRST', 'BALANCED_P1_P2_P3', 'CAM_EXAM_FIRST'];
  if (!validStrategies.includes(res.reading_strategy)) {
    res.reading_strategy = res.estimated_band >= 6.5 ? 'CAM_EXAM_FIRST' : (res.estimated_band < 5.5 ? 'SKILL_FIRST' : 'BALANCED_P1_P2_P3');
  }

  if (!Array.isArray(res.reading_passage_levels) || res.reading_passage_levels.length === 0) {
    res.reading_passage_levels = res.estimated_band >= 6.0 ? ['P2', 'P3'] : ['P1', 'P2', 'P3'];
  }

  res.reading_skill_quota = Math.max(8, Math.min(40, parseInt(res.reading_skill_quota, 10) || 18));

  const mergedWeak = Array.from(new Set([
    ...(Array.isArray(res.retained_weak_tags) ? res.retained_weak_tags : []),
    ...(Array.isArray(res.weak_tags) ? res.weak_tags : []),
    ...res.reading_focus_skills
  ].filter(Boolean)));

  res.retained_weak_tags = mergedWeak;
  res.weak_tags = mergedWeak;
  res.academic_summary = sanitizeSafeText(res.academic_summary || fallback.academic_summary);
  if (Array.isArray(res.pedagogical_constraints)) {
    res.pedagogical_constraints = res.pedagogical_constraints.map(sanitizeSafeText).filter(Boolean);
  }
  return res;
}

/**
 * GỌI GEMINI XỬ LÝ CHẨN ĐOÁN KẾT HỢP STRUCTURED JSON & MAX OUTPUT TOKENS
 */
export async function callGeminiDiagnostic(promptText) {
  const apiKey = getApiKey();

  for (const model of ACTIVE_MODELS) {
    let attempts = 0;
    const maxAttempts = model.includes('lite') ? 3 : 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[AI Diagnostic] Đang kết nối ${model} (Lần ${attempts}/${maxAttempts})...`);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: promptText }] }],
              generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 4096,
                temperature: 0.2
              }
            })
          }
        );

        if (response.status === 503 || response.status === 429) {
          throw new Error(`Server bận: ${response.status}`);
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`API Lỗi ${response.status}: ${errData.error?.message || 'Unknown'}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (rawText) {
          return { model, rawText };
        } else {
          throw new Error("Phản hồi rỗng từ model.");
        }

      } catch (error) {
        console.warn(`[AI Diagnostic] Cảnh báo tại ${model} (Lần ${attempts}):`, error.message);
        if (attempts < maxAttempts) {
          await new Promise((res) => setTimeout(res, 1200));
        }
      }
    }
  }

  throw new Error("Tất cả các model Gemini khả dụng đều đang bận. Vui lòng thử lại sau ít phút.");
}

function extractValidJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return "{}";
  let cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

/**
 * BẢN THIẾT KẾ DỰ PHÒNG KHẨN CẤP (ZERO-CRASH FALLBACK) CẬP NHẬT HỒ SƠ INTAKE
 */
function createEmergencyFallback(studentInputText) {
  console.warn("[AI Diagnostic] 🛡️ Kích hoạt bộ sinh lộ trình dự phòng an toàn!");
  
  const startMatch = String(studentInputText || '').match(/Start\s*Band[:\s]*([0-9.]+)/i);
  const targetMatch = String(studentInputText || '').match(/Target\s*Band[:\s]*([0-9.]+)/i);
  
  const startBand = startMatch ? parseFloat(startMatch[1]) : 3.5;
  const targetBand = targetMatch ? parseFloat(targetMatch[1]) : 7.0;
  const readingFocusSkills = inferReadingSkillsFromText(studentInputText, startBand);
  const readingStrategy = startBand >= 6.5 ? "CAM_EXAM_FIRST" : (startBand < 5.5 ? "SKILL_FIRST" : "BALANCED_P1_P2_P3");
  const readingPassageLevels = startBand >= 6.0 ? ["P2", "P3"] : ["P1", "P2", "P3"];
  
  const weakList = ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_B2", "PWT1_CORE", "PWT2_CORE", ...readingFocusSkills];

  return {
    estimated_band: startBand,
    target_band: targetBand,
    skill_scores: {
      reading: Math.min(7.0, startBand + 0.5),
      listening: startBand,
      writing: startBand,
      speaking: Math.max(3.0, startBand - 0.5)
    },
    bottleneck_skill: "WRITING",
    schedule_mode: "SEQUENTIAL_PHASES",
    phase_order: [
      "PHASE_1_GRAMMAR",
      "PHASE_2_READING_VOCAB",
      "PHASE_3_LISTENING",
      "PHASE_4_WRITING",
      "PHASE_5_SPEAKING"
    ],
    vocab_requirement: "FULL_100_PERCENT",
    reading_strategy: readingStrategy,
    reading_focus_skills: readingFocusSkills,
    reading_passage_levels: readingPassageLevels,
    reading_skill_quota: 18,
    quota_policy: {
      max_pre_skill_ratio: 0.25,
      min_official_exam_ratio: 0.75,
      prohibited_levels: startBand >= 5.0 ? ["A1"] : [],
      review_interval_days: 3,
      review_skills: ["READING", "LISTENING"]
    },
    academic_summary: `Hệ thống đã đồng bộ hồ sơ học viên với Start Band ${startBand} và Target Band ${targetBand}. Lộ trình 5 chặng tuần tự được thiết lập: Khắc phục Ngữ pháp trọng tâm, cày sạch 28 Unit từ vựng song song Reading st-101..320 theo dạng yếu, bứt phá Listening, tập trung thực chiến Writing và bùng nổ Speaking ở chặng về đích. Đã kích hoạt cơ chế ôn tập 3 ngày 1 đề Cam và ép 75% đề thi thật.`,
    pruned_domains: ["PRE_READING"],
    pruned_tags: ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
    retained_weak_tags: weakList,
    intensity_weights: {
      SPEAKING: 2.5,
      PRE_SPEAKING: 1.5,
      WRITING_T1: 1.8,
      WRITING_T2: 2.2,
      LISTENING: 1.5,
      READING: 1.0,
      GRAMMAR: 1.2,
      VOCABULARY: 2.0
    },
    pedagogical_constraints: [
      "Thực thi đúng trình tự 5 chặng: Ngữ pháp -> Reading + 100% Từ vựng (28 Unit) -> Listening -> Writing -> Speaking",
      `Khóa chết điểm xuất phát Band ${startBand} và mục tiêu Band ${targetBand} theo hồ sơ học sinh`,
      `Cấm học bài Pre-A1 vỡ lòng đối với học viên Band ${startBand}. Dành tối thiểu 75% thời lượng cho Đề thi chính thức`,
      "Cứ cách 3 ngày ở Chặng Viết và Nói phải giải 1 đề Reading/Listening Cambridge để duy trì phong độ",
      "Khóa tài liệu gợi ý Writing sau 5 phút để ép tư duy tự lập luận PEEL độc lập"
    ],
    excluded_domains: ["PRE_READING"],
    focus_domains: ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING_T1", "WRITING_T2", "SPEAKING"],
    mastered_tags: ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
    weak_tags: weakList
  };
}

/**
 * HÀM CHẨN ĐOÁN BẢNG ĐIỂM KẾT HỢP HỒ SƠ TIỀN SỬ HỌC THUẬT ONBOARDING INTAKE
 * @param {string} studentInputText - Văn bản tự thuật hoặc nội dung file báo cáo kèm intake profile
 */
export async function analyzeStudentDiagnostic(studentInputText) {
  const prompt = `
Bạn là Giám Đốc Học Thuật IELTS cấp cao kiêm Kiến Trúc Sư Điều Phối Chương Trình Học Cá Nhân Hóa.
Nhiệm vụ tối thượng: Phân tích sâu sắc hồ sơ năng lực học thuật, tiền sử học tập và các yêu cầu sư phạm đầu vào của học sinh dưới đây:
"""
${studentInputText}
"""

HỆ THỐNG KHO BÀI TẬP HIỆN CÓ CỦA TRUNG TÂM (HƠN 1000 ĐỐT BÀI ĐÃ ĐƯỢC MÃ HÓA ID):
1. GRAMMAR (S1_GRAM, S2_GRAM): 18 chuyên đề từ thì cơ bản đến câu phức, đảo ngữ, bị động, mệnh đề quan hệ.
2. VOCABULARY: Trọn vẹn 28 Unit gồm:
   - 10 Unit bộ 300 từ học thuật (S1_VOCAB_01..04, S2_VOCAB_300_05..10).
   - 18 Unit bộ 540 từ chuyên ngành nâng cao (S2_VOCAB_540_01..06, S3_VOCAB_540_07..18).
3. READING (GỒM 3 TẦNG CHUYÊN BIỆT):
   - Tầng A — Kho 156 bài Luyện Theo Dạng từ Bộ Sưu Tầm st-101..320 (Tag: READ_SKILL): NOTE_COMP, TFNG, YNNG, SUMMARY_COMP, SUMMARY_BOX, MATCH_INFO, MATCH_FEATURES, MATCH_ENDINGS, MCQ, MCQ_TWO.
   - Tầng B — Kho 60 bài Full Passage Bộ Sưu Tầm st-101..320 (Tag: READ_COLLECTION): st-101..120 (P1), st-201..220 (P2), st-301..320 (P3).
   - Tầng C — Kho Cambridge 17 đến Cam 21: Cam 17-19 (có mớm) và Cam 20-21 (tự lực không mớm).
4. LISTENING: Pre-Listening (A1, A2/B1, B2/C1) và Cam 19 đến Cam 21 (tốc độ 1.1x).
5. WRITING: Pre-Writing Task 1 (S2_PWT1) & Task 2 PEEL (S2_PWT2); Đề thi thật hoàn chỉnh Task 1 & Task 2 250 từ (S3_WT, S4_WT).
6. SPEAKING: Shadowing Pre-Speaking (A1, A2/B1, B2, C1) và Forecast Part 1/2/3.
7. MOCK_TEST: 12 đề thi thử áp lực phòng thi liên tục 3 tiếng.

SÁU BỘ LUẬT SƯ PHẠM BẮT BUỘC BẠN PHẢI TUÂN THỦ KHI ĐIỀU PHỐI:

LUẬT 1: KHÓA CHẾT ĐIỂM XUẤT PHÁT (START BAND) VÀ MỤC TIÊU (TARGET BAND) - QUAN TRỌNG NHẤT!
- BẮT BUỘC gán "estimated_band" đúng bằng con số ghi ở "- Start Band: X.X" trong hồ sơ học sinh. TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý TĂNG HOẶC ĐOÁN LẠI BAND XUẤT PHÁT (Ví dụ học sinh thi 3.5 thì bắt buộc estimated_band = 3.5, cấm tự nâng lên 5.5).
- BẮT BUỘC gán "target_band" đúng bằng con số ghi ở "- Target Band: X.X" trong hồ sơ học sinh.

LUẬT 2: KÊ ĐƠN ĐẶC TRỊ DỰA TRÊN TIỀN SỬ HỌC THUẬT & NỖI SỢ TÂM LÝ
- Đọc kỹ trường "- Kỹ năng tự ti / sợ nhất" của học sinh:
  + Nếu học sinh sợ Writing / bí ý tưởng: Bắt buộc đưa "PWT2_CORE" vào weak_tags và tăng intensity_weights.WRITING_T2 >= 2.0.
  + Nếu học sinh sợ Listening / trôi băng: Bắt buộc đưa các thẻ "PRE_LIS_INTER" hoặc "PRE_LIS_ADV" vào weak_tags.
- Đối chiếu giữa "- ĐTB môn Tiếng Anh" ở trường và điểm thi Diagnostic: Nếu điểm trường cao (8.5 - 9.0) nhưng điểm nghe/nói bài test thấp -> Nhận xét rõ học sinh bị bệnh học vẹt ngữ pháp trường công, cần dồn thời gian cho Dictation và Shadowing.

LUẬT 3: LỌC TRÌNH ĐỘ THÔNG MINH (TRÁNH BẪY HỌC VỠ LÒNG)
- Nếu học sinh xuất phát Band >= 5.0: BẮT BUỘC LOẠI BỎ 100% các bài Pre-Listening A1 và Pre-Speaking A1.
- Nếu học sinh xuất phát Band >= 6.0: Loại bỏ toàn bộ bài có mớm, đẩy thẳng vào Cam không mớm và Shadowing C1.

LUẬT 4: KHÓA HẠN NGẠCH BÀI TẬP (75% ĐỀ THI THẬT)
- Phần PRE chỉ chiếm tối đa 20% - 25% tổng thời lượng. Tối thiểu 75% - 80% thời lượng Writing và Speaking bắt buộc là Đề thi thật.

LUẬT 5: THIẾT LẬP 5 CHẶNG TUẦN TỰ THEO MỆNH LỆNH
- CHẶNG 1: Nền tảng Ngữ pháp trọng tâm (đặc trị câu sai bài test).
- CHẶNG 2: Reading thực chiến song song QUÉT SẠCH 100% KHO TỪ VỰNG 28 UNIT.
- CHẶNG 3: Chiến thuật Listening phòng thi.
- CHẶNG 4: Thực chiến Writing Task 1 & Task 2.
- CHẶNG 5: Về đích bùng nổ Speaking & Shadowing.
- Vòng lặp duy trì: Cứ 3 ngày ở Chặng 4 & 5 phải chèn 1 đề Reading/Listening Cam để duy trì phong độ.

LUẬT 6: ĐIỀU PHỐI KHO READING SƯU TẦM st-101..320 THEO DẠNG BÀI
- Chọn mã dạng bài Reading cần trị từ danh sách: NOTE_COMP, TFNG, YNNG, SUMMARY_COMP, SUMMARY_BOX, MATCH_INFO, MATCH_FEATURES, MATCH_ENDINGS, MCQ, MCQ_TWO.

HÃY TRẢ VỀ DUY NHẤT 1 CHUỖI JSON THUẦN HỢP LỆ (TUYỆT ĐỐI KHÔNG DÙNG DẤU NGOẶC KÉP TRONG NỘI DUNG CHỮ, KHÔNG DÙNG MARKDOWN):
{
  "estimated_band": 3.5,
  "target_band": 7.0,
  "skill_scores": {
    "reading": 4.5,
    "listening": 3.5,
    "writing": 3.5,
    "speaking": 3.5
  },
  "bottleneck_skill": "WRITING",
  "schedule_mode": "SEQUENTIAL_PHASES",
  "phase_order": [
    "PHASE_1_GRAMMAR",
    "PHASE_2_READING_VOCAB",
    "PHASE_3_LISTENING",
    "PHASE_4_WRITING",
    "PHASE_5_SPEAKING"
  ],
  "vocab_requirement": "FULL_100_PERCENT",
  "reading_strategy": "SKILL_FIRST",
  "reading_focus_skills": ["TFNG", "NOTE_COMP", "MATCH_INFO", "YNNG"],
  "reading_passage_levels": ["P1", "P2", "P3"],
  "reading_skill_quota": 18,
  "quota_policy": {
    "max_pre_skill_ratio": 0.25,
    "min_official_exam_ratio": 0.75,
    "prohibited_levels": ["A1"],
    "review_interval_days": 3,
    "review_skills": ["READING", "LISTENING"]
  },
  "academic_summary": "Phân tích học thuật: Đã khóa chặt điểm xuất phát theo bài test và mục tiêu theo kỳ vọng học sinh. Lộ trình tuân thủ 5 chặng tuần tự: Củng cố ngữ pháp, quét sạch 100% kho 28 Unit từ vựng song song Reading st-101..320, bứt phá Listening, thực chiến Writing và bùng nổ Speaking. Đã kích hoạt cơ chế ôn tập 3 ngày 1 đề Cam và ép 75% đề thi thật.",
  "pruned_domains": ["PRE_READING"],
  "pruned_tags": ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
  "retained_weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_B2", "PWT1_CORE", "PWT2_CORE", "TFNG", "NOTE_COMP"],
  "intensity_weights": {
    "SPEAKING": 2.5,
    "PRE_SPEAKING": 1.5,
    "WRITING_T1": 1.8,
    "WRITING_T2": 2.2,
    "LISTENING": 1.5,
    "READING": 1.0,
    "GRAMMAR": 1.2,
    "VOCABULARY": 2.0
  },
  "pedagogical_constraints": [
    "Thực thi đúng trình tự 5 chặng: Ngữ pháp -> Reading + 100% Từ vựng (28 Unit) -> Listening -> Writing -> Speaking",
    "Khóa chết điểm xuất phát và mục tiêu đúng theo hồ sơ bài thi đầu vào",
    "Cấm học bài Pre-A1 vỡ lòng đối với học viên Band khá. Dành tối thiểu 75% thời lượng cho Đề thi chính thức",
    "Cứ cách 3 ngày ở Chặng Viết và Nói phải giải 1 đề Reading/Listening Cambridge để duy trì phong độ",
    "Khóa tài liệu gợi ý Writing sau 5 phút để ép tư duy tự lập luận PEEL độc lập"
  ],
  "excluded_domains": ["PRE_READING"],
  "focus_domains": ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING_T1", "WRITING_T2", "SPEAKING"],
  "mastered_tags": ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
  "weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_B2", "PWT1_CORE", "PWT2_CORE", "TFNG", "NOTE_COMP"]
}
`;

  try {
    const result = await callGeminiDiagnostic(prompt);
    const cleanJsonString = extractValidJson(result.rawText);
    const parsed = JSON.parse(cleanJsonString);
    return normalizeAIDiagnosticResult(parsed, studentInputText);
  } catch (err) {
    console.error("[AI Diagnostic] Lỗi phân tích cú pháp:", err.message);
    return createEmergencyFallback(studentInputText);
  }
}
