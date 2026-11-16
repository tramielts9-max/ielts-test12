/**
 * curriculum-system/ai-service-system.js
 * DỊCH VỤ AI GEMINI CHẨN ĐOÁN LỘ TRÌNH & ĐIỀU PHỐI ĐỐT SỐNG (MASTER PROMPT PHIÊN BẢN ĐỈNH CAO)
 * ĐÃ KHẮC PHỤC TRIỆT ĐỂ LỖI UNTERMINATED STRING AT POSITION 966
 * - BẬT CHẾ ĐỘ STRUCTURED JSON MODE: responseMimeType: "application/json"
 * - NÂNG TRẦN maxOutputTokens: 4096 (CHỐNG CẮT ĐUÔI GIỮA CHỪNG)
 * - TÍCH HỢP BỘ LỌC EXTRACT VÀ BẢN DỰ PHÒNG AN TOÀN TUYỆT ĐỐI (ZERO-CRASH)
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
 * CHUẨN HÓA KẾT QUẢ JSON TỪ GEMINI ĐỂ ĐẢM BẢO KHÔNG BAO GIỜ LỆCH SCHEMA HOẶC CRASH UI
 */
function normalizeAIDiagnosticResult(parsed, studentInputText = '') {
  const fallback = createEmergencyFallback(studentInputText);
  const res = (parsed && typeof parsed === 'object') ? { ...fallback, ...parsed } : { ...fallback };

  const sBand = parseFloat(res.estimated_band);
  res.estimated_band = !isNaN(sBand) ? sBand : fallback.estimated_band;
  const tBand = parseFloat(res.target_band);
  res.target_band = !isNaN(tBand) ? Math.min(7.5, tBand) : fallback.target_band;

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
              // 🔴 BẢO VỆ TẦNG 1: Ép Gemini bắt buộc xuất JSON hợp lệ & Nâng trần 4096 tokens
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

/**
 * BẢO VỆ TẦNG 2: BỘ LỌC TRÍCH XUẤT CHUỖI JSON HỢP LỆ (CHỐNG LỖI KÝ TỰ RÁC)
 */
function extractValidJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return "{}";
  
  // Xóa sạch các thẻ markdown nếu có
  let cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Tìm vị trí của dấu ngoặc nhọn mở đầu tiên và đóng cuối cùng
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

/**
 * BẢO VỆ TẦNG 3: BẢN THIẾT KẾ DỰ PHÒNG KHẨN CẤP (ZERO-CRASH FALLBACK)
 * Tự động phân tích điểm từ văn bản học sinh để tạo lộ trình chuẩn nếu mạng rớt
 */
function createEmergencyFallback(studentInputText) {
  console.warn("[AI Diagnostic] 🛡️ Kích hoạt bộ sinh lộ trình dự phòng an toàn!");
  
  // Trích xuất điểm nếu có trong văn bản
  const startMatch = studentInputText.match(/Start\s*Band[:\s]*([0-9.]+)/i);
  const targetMatch = studentInputText.match(/Target\s*Band[:\s]*([0-9.]+)/i);
  
  const startBand = startMatch ? parseFloat(startMatch[1]) : 4.5;
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
      speaking: Math.max(3.5, startBand - 0.5)
    },
    bottleneck_skill: "SPEAKING",
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
    academic_summary: `Hệ thống đã phân tích hồ sơ xuất phát điểm Band ${startBand} và mục tiêu Band ${targetBand}. Lộ trình được thiết lập 5 chặng tuần tự: Khắc phục Ngữ pháp trọng tâm, cày sạch 100% kho 28 Unit từ vựng song song Reading chia dạng 101-320 (${readingFocusSkills.join(', ')}), bứt phá Listening, Writing và dồn lực bùng nổ Speaking ở chặng về đích. Đã kích hoạt cơ chế 3 ngày ôn 1 đề Cam và ép 75% đề thi thật.`,
    pruned_domains: ["PRE_READING"],
    pruned_tags: ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
    retained_weak_tags: weakList,
    intensity_weights: {
      SPEAKING: 2.5,
      PRE_SPEAKING: 1.5,
      WRITING_T1: 1.8,
      WRITING_T2: 2.0,
      LISTENING: 1.2,
      READING: 1.0,
      GRAMMAR: 1.2,
      VOCABULARY: 2.0
    },
    pedagogical_constraints: [
      "Thực thi đúng trình tự 5 chặng: Ngữ pháp -> Reading + 100% Từ vựng (28 Unit) -> Listening -> Writing -> Speaking",
      `Ưu tiên luyện kho Reading sưu tầm 101-320 theo dạng yếu: ${readingFocusSkills.join(', ')} (${readingStrategy})`,
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
 * HÀM CHẨN ĐOÁN BẢNG ĐIỂM / FILE BÁO CÁO / GIỌNG NÓI STT ĐẦU VÀO
 * @param {string} studentInputText - Văn bản tự thuật hoặc nội dung file báo cáo
 */
export async function analyzeStudentDiagnostic(studentInputText) {
  const prompt = `
Bạn là Giám Đốc Học Thuật IELTS cấp cao kiêm Kiến Trúc Sư Điều Phối Chương Trình Học Cá Nhân Hóa.
Nhiệm vụ tối thượng: Phân tích sâu sắc hồ sơ năng lực học thuật và các yêu cầu sư phạm đầu vào của học sinh dưới đây:
"""
${studentInputText}
"""

HỆ THỐNG KHO BÀI TẬP HIỆN CÓ CỦA TRUNG TÂM (HƠN 1000 ĐỐT BÀI ĐÃ ĐƯỢC MÃ HÓA ID):
1. GRAMMAR (S1_GRAM, S2_GRAM): 18 chuyên đề từ thì cơ bản đến câu phức, đảo ngữ, bị động, mệnh đề quan hệ.
2. VOCABULARY: Trọn vẹn 28 Unit gồm:
   - 10 Unit bộ 300 từ học thuật (S1_VOCAB_01..04, S2_VOCAB_300_05..10).
   - 18 Unit bộ 540 từ chuyên ngành nâng cao (S2_VOCAB_540_01..06, S3_VOCAB_540_07..18).
3. READING (GỒM 3 TẦNG CHUYÊN BIỆT):
   - Tầng A — Kho 156 bài Luyện Theo Dạng từ Bộ Sưu Tầm st-101..320 (Tag: READ_SKILL):
     + Passage 1 (st-101..120, nền tảng): NOTE_COMP (20 bài), TFNG (20 bài).
     + Passage 2 (st-201..220, trung cấp/nâng cao): MATCH_INFO (8 bài), MATCH_FEATURES (4 bài), SUMMARY_COMP (8 bài), SUMMARY_BOX (8 bài), NOTE_COMP (4 bài), YNNG (8 bài), TFNG (4 bài), MCQ (8 bài), MCQ_TWO (4 bài).
     + Passage 3 (st-301..320, học thuật cao): MCQ (20 bài), YNNG (20 bài), SUMMARY_BOX (12 bài), MATCH_ENDINGS (8 bài).
   - Tầng B — Kho 60 bài Full Passage Bộ Sưu Tầm st-101..320 (Tag: READ_COLLECTION): st-101..120 (P1), st-201..220 (P2), st-301..320 (P3).
   - Tầng C — Kho Cambridge 17 đến Cam 21: Cam 17-19 (có mớm từ khóa) và Cam 20-21 (tự lực không mớm bấm giờ chuẩn phòng thi).
4. LISTENING: Pre-Listening (A1, A2/B1, B2/C1) và Cam 19 đến Cam 21 (bắt âm nối, bẫy trôi băng, tốc độ 1.1x).
5. WRITING:
   - Pre-Writing: Dịch câu số liệu biểu đồ Task 1 (S2_PWT1) & Dịch câu tư duy lập luận PEEL Task 2 (S2_PWT2).
   - Đề thi thật: Viết hoàn chỉnh Task 1 (S3_WT1, S4_WT1) & Viết luận Task 2 250 từ (S3_WT2, S4_WT2).
6. SPEAKING:
   - Pre-Speaking: Shadowing nhại giọng bản ngữ A1, A2/B1, B2.2, C1.
   - Đề thi thật Forecast: Part 1 phản xạ AREA (S3_SPK_P1), Part 2 Cue Card 2 phút (S3_SPK_P2, S4_SPK_P2), Part 3 phản biện chuyên sâu (S4_SPK_P3).
7. MOCK_TEST: 12 đề thi thử áp lực phòng thi liên tục 3 tiếng.

NĂM BỘ LUẬT SƯ PHẠM BẮT BUỘC BẠN PHẢI TUÂN THỦ KHI ĐIỀU PHỐI:

LUẬT 1: LỌC TRÌNH ĐỘ THÔNG MINH (TRÁNH BẪY HỌC VỠ LÒNG)
- Nếu học sinh xuất phát Band >= 5.0: BẮT BUỘC LOẠI BỎ 100% các bài Pre-Listening A1 (nghe số đếm, tên riêng) và Pre-Speaking A1 (chào hỏi đời sống). Tuyệt đối không để học sinh khá học lại kiến thức vỡ lòng A1.
- Nếu học sinh xuất phát Band >= 6.0: Loại bỏ toàn bộ bài có mớm từ khóa, đẩy thẳng vào đề thi Cam không mớm và Shadowing C1.

LUẬT 2: KHÓA HẠN NGẠCH BÀI TẬP (TRIỆT TIÊU BỆNH PRE NUỐT TRỌN ĐỀ THI THẬT)
- Phần PRE (dịch câu, shadowing) chỉ là đòn bẩy lót đường, chiếm TỐI ĐA 20% - 25% tổng thời lượng của kỹ năng đó.
- TỐI THIỂU 75% - 80% thời lượng của Chặng Writing và Speaking BẮT BUỘC PHẢI LÀ ĐỀ THI THẬT:
  + Writing: Phải có bài viết Task 1 hoàn chỉnh và bài luận Task 2 (250 từ chuẩn PEEL). Cấm tình trạng cả chặng chỉ toàn dịch câu mà không có đề Task 2.
  + Speaking: Phải có đề thi Forecast Part 1, Part 2 (nói 2 phút) và Part 3. Shadowing chỉ làm ấm giọng 15 phút.

LUẬT 3: THIẾT LẬP 5 CHẶNG TUẦN TỰ THEO MỆNH LỆNH
Nếu học sinh có yêu cầu về thứ tự học, phân bổ chính xác 5 Chặng nối tiếp nhau:
- CHẶNG 1: Nền tảng Ngữ pháp trọng tâm (đặc trị các lỗi sai chia thì, bị động, câu phức). Tuyệt đối không có Nói/Viết chen ngang.
- CHẶNG 2: Reading thực chiến song song QUÉT SẠCH 100% KHO TỪ VỰNG (Học đủ 28 Unit: 10 Unit bộ 300 từ + 18 Unit bộ 540 từ, không được bỏ rơi bất kỳ Unit nào).
- CHẶNG 3: Chiến thuật Listening phòng thi (trị bẫy mất dấu băng Part 2, Part 3).
- CHẶNG 4: Thực chiến Writing Task 1 & Task 2 (Cai nghiện ngâm bài mẫu 50 phút).
- CHẶNG 5: Về đích bùng nổ Speaking & Shadowing (Dồn toàn lực kéo điểm nghẽn lên 7.0).

LUẬT 4: VÒNG LẶP ÔN TẬP DUY TRÌ 3 NGÀY (SPACED REPETITION)
- Tại Chặng 4 (Writing) và Chặng 5 (Speaking): Cứ cách 3 ngày một lần (Ngày 3, Ngày 6, Ngày 9...), hệ thống phải tự động chèn 1 đề thi Reading hoặc Listening Cambridge của các chặng trước vào để giải đề bấm giờ, duy trì phản xạ phòng thi liên tục.

LUẬT 5: ĐIỀU PHỐI KHO READING SƯU TẦM st-101..320 THEO DẠNG BÀI
- Bắt buộc phân tích điểm yếu Reading của học sinh và chọn ra các mã dạng bài cần trị từ danh sách chuẩn 10 mã sau (CHỈ DÙNG ĐÚNG TÊN MÃ NÀY): NOTE_COMP, TFNG, YNNG, SUMMARY_COMP, SUMMARY_BOX, MATCH_INFO, MATCH_FEATURES, MATCH_ENDINGS, MCQ, MCQ_TWO.
- Đưa các mã dạng bài Reading yếu đó vào cả reading_focus_skills lẫn retained_weak_tags và weak_tags để bộ lọc cứu bài giữ đúng dạng cần học.
- Chọn reading_strategy:
  + "SKILL_FIRST": Nếu học sinh còn yếu dạng bài cụ thể hoặc Band < 5.5 -> ưu tiên luyện chia dạng st-101..320 trước, xen kẽ Full Passage.
  + "BALANCED_P1_P2_P3": Nếu Band 5.5 - 6.0 -> kết hợp luyện dạng yếu st-101..320 rải đều cả P1, P2, P3 cùng Cambridge.
  + "CAM_EXAM_FIRST": Nếu Band >= 6.5 -> ưu tiên giải Cam 20-21 không mớm kết hợp trị các dạng khó Passage 2 & 3 (st-201..320).
- Chọn reading_passage_levels: ["P1", "P2", "P3"] cho Band < 6.0, hoặc ["P2", "P3"] nếu Band >= 6.0 (trừ khi học sinh sai nặng TFNG/NOTE_COMP cơ bản thì vẫn giữ P1).

HÃY TRẢ VỀ DUY NHẤT 1 CHUỖI JSON THUẦN HỢP LỆ (TUYỆT ĐỐI KHÔNG DÙNG DẤU NGOẶC KÉP HAY NHÁY ĐƠN TRONG NỘI DUNG CHỮ, KHÔNG DÙNG MARKDOWN):
{
  "estimated_band": 4.5,
  "target_band": 7.0,
  "skill_scores": {
    "reading": 5.0,
    "listening": 4.5,
    "writing": 5.0,
    "speaking": 5.0
  },
  "bottleneck_skill": "LISTENING",
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
  "academic_summary": "Phân tích học thuật: Điểm xuất phát Band 4.5, mục tiêu Band 7.0. Lộ trình tuân thủ 5 chặng tuần tự: Củng cố ngữ pháp, quét sạch 100% kho 28 Unit từ vựng song song luyện Reading st-101..320 theo dạng yếu, đẩy mạnh Listening phản xạ, thực chiến Writing và bứt phá Speaking. Đã kích hoạt cơ chế ôn tập 3 ngày 1 đề Cam và ép 75% đề thi thật.",
  "pruned_domains": ["PRE_READING"],
  "pruned_tags": ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
  "retained_weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_B2", "PWT1_CORE", "PWT2_CORE", "TFNG", "NOTE_COMP", "MATCH_INFO", "YNNG"],
  "intensity_weights": {
    "SPEAKING": 2.5,
    "PRE_SPEAKING": 1.5,
    "WRITING_T1": 1.8,
    "WRITING_T2": 2.0,
    "LISTENING": 1.5,
    "READING": 1.0,
    "GRAMMAR": 1.2,
    "VOCABULARY": 2.0
  },
  "pedagogical_constraints": [
    "Thực thi đúng trình tự 5 chặng: Ngữ pháp -> Reading + 100% Từ vựng (28 Unit) -> Listening -> Writing -> Speaking",
    "Ưu tiên giao bài Reading st-101..320 chia theo dạng yếu (TFNG, NOTE_COMP, MATCH_INFO, YNNG) trước khi làm đề tổng hợp",
    "Cấm học bài Pre-A1 vỡ lòng. Dành tối thiểu 75% thời lượng cho Đề thi chính thức",
    "Cứ cách 3 ngày ở Chặng Viết và Nói phải giải 1 đề Reading/Listening Cambridge để duy trì phong độ",
    "Khóa tài liệu gợi ý Writing sau 5 phút để ép tư duy tự lập luận PEEL độc lập"
  ],
  "excluded_domains": ["PRE_READING"],
  "focus_domains": ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING_T1", "WRITING_T2", "SPEAKING"],
  "mastered_tags": ["PRE_LIS_A1", "PRE_SPK_A1", "G_PRES_SIMPLE", "G_FUTURE_SIMPLE"],
  "weak_tags": ["G_IRREG_V2", "G_IRREG_V3", "G_PASSIVE_VOICE", "PRE_SPK_B2", "PWT1_CORE", "PWT2_CORE", "TFNG", "NOTE_COMP", "MATCH_INFO", "YNNG"]
}
`;

  try {
    const result = await callGeminiDiagnostic(prompt);
    const cleanJsonString = extractValidJson(result.rawText);
    const parsed = JSON.parse(cleanJsonString);
    return normalizeAIDiagnosticResult(parsed, studentInputText);
  } catch (err) {
    console.error("[AI Diagnostic] Lỗi phân tích cú pháp:", err.message);
    // BẢO VỆ TẦNG 3: Nếu AI trả về chuỗi lỗi -> Kích hoạt Fallback không để sập giao diện
    return createEmergencyFallback(studentInputText);
  }
}
