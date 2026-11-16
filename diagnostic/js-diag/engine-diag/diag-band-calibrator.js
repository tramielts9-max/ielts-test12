/**
 * diagnostic/js-diag/engine-diag/diag-band-calibrator.js
 * MODULE ĐỊNH VỊ BAND CHUẨN KHẢO THÍ, TÍNH TỔNG ĐIỂM & TRÍCH XUẤT BLUEPRINT CÂU SAI
 * (BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ TÍNH NĂNG NÀO)
 * - MA TRẬN KHỐNG CHẾ TRẦN ĐIỂM: TEST 1 (80/100 = BAND 4.0, MAX 5.0)
 * - MA TRẬN TEST 2 (MAX 6.5) & TEST 3 (6.0 - 7.5+)
 * - BỘ ĐẾM TỪ AN TOÀN CHỐNG LỖI KÝ TỰ RÁC VÀ KHOẢNG TRẮNG
 * - TRÍCH XUẤT BLUEPRINT LỖ HỔNG PHỤC VỤ BĂM LỘ TRÌNH HỌC TẬP THÍCH ỨNG (KÈM MÃ DẠNG READING 101-320)
 */

import { roundIELTS, calculateSmartOverCap } from '../diag-ai.js';

export class DiagBandCalibrator {
  constructor() {}

  // =========================================================================
  // 1. BỘ ĐẾM TỪ AN TOÀN CHO CẢ BÀI VIẾT VÀ BẢN KÝ ÂM BÀI NÓI
  // =========================================================================
  countWords(str) {
    if (!str || typeof str !== 'string') return 0;
    const cleaned = str
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).filter(Boolean).length;
  }

  // =========================================================================
  // 2. THUẬT TOÁN ĐỊNH VỊ BAND THEO TỪNG BÀI TEST (TEST 1: 80/100 = BAND 4.0)
  // =========================================================================
  calculateCalibratedBand(testId, overallScore, wBandNum = 0.0, sBandNum = 0.0) {
    const rawScore = parseFloat(overallScore);
    const score = isNaN(rawScore) ? 0 : Math.max(0, Math.min(100, rawScore));
    let estimatedBand = "0.0";
    let bandReason = "";

    // MA TRẬN TEST 1: NỀN TẢNG (TRẦN CHUẨN 4.5 - MAX 5.0 CHO 100% ĐIỂM)
    if (testId === 'test_01') {
      if (score === 0) {
        estimatedBand = "0.0";
        bandReason = "Chưa làm bài khảo sát nền tảng.";
      } else if (score < 25) {
        estimatedBand = "1.0 - 2.0";
        bandReason = "Mức độ nhận diện ngôn ngữ ở giai đoạn vỡ lòng (Pre-A1). Cần xây gốc từ phát âm và từ vựng sinh hoạt.";
      } else if (score < 50) {
        estimatedBand = "2.5 - 3.0";
        bandReason = "Đã nhận biết được câu đơn giản nhưng hổng thì quá khứ và từ vựng nhận diện. Cần củng cố Ngữ pháp & Dictation A1.";
      } else if (score < 75) {
        estimatedBand = "3.5";
        bandReason = "Nắm được ngữ pháp cơ bản nhưng phản xạ nghe còn chậm, câu viết còn bị dịch word-by-word.";
      } else if (score < 90) {
        estimatedBand = "4.0"; // 80/100 RƠI CHÍNH XÁC VÀO BAND 4.0!
        bandReason = "Hoàn thành tốt bài khảo sát nền tảng Test 1. Nền câu đơn vững vàng, sẵn sàng bước sang Test 2.";
      } else if (score < 95) {
        estimatedBand = "4.5";
        bandReason = "Nắm rất chắc kiến thức nền tảng, phản xạ nhanh và chính xác. Sẵn sàng bứt phá lên Band 5.5.";
      } else {
        estimatedBand = "5.0";
        bandReason = "Chạm trần tối đa bài Test 1 (Làm đúng tuyệt đối trên 95%). Đủ điều kiện vượt cấp thẳng lên Chặng 2.";
      }

    // MA TRẬN TEST 2: CHUẨN HÓA (TRẦN CHUẨN 6.0 - MAX 6.5)
    } else if (testId === 'test_02') {
      if (score < 30) {
        estimatedBand = "3.5 - 4.0";
        bandReason = "Hổng các cấu trúc câu điều kiện, câu bị động và dễ mất dấu khi nghe bài Map Labelling.";
      } else if (score < 50) {
        estimatedBand = "4.5";
        bandReason = "Đã xử lý được các đoạn văn trung cấp nhưng vốn từ học thuật còn hạn chế, Writing chưa có câu phức.";
      } else if (score < 70) {
        estimatedBand = "5.0";
        bandReason = "Nghe hiểu hội thoại tốt, làm chủ câu đơn. Điểm nghẽn nằm ở tư duy triển khai lập luận PEEL và từ vựng chuyên ngành.";
      } else if (score < 85) {
        estimatedBand = "5.5";
        bandReason = "Đạt chuẩn đầu ra trung cấp vững vàng. Cần rèn thêm kỹ thuật Skimming/Scanning đề dài.";
      } else if (score < 95) {
        estimatedBand = "6.0";
        bandReason = "Chạm trần chuẩn hóa của bài Test 2. Phản xạ tốt, ít mắc bẫy từ khóa của Cambridge.";
      } else {
        estimatedBand = "6.5";
        bandReason = "Xuất sắc vượt trần Test 2 (Đạt trên 95% điểm số). Sẵn sàng chinh phục bài Test 3 đỉnh cao.";
      }

    // MA TRẬN TEST 3: ĐỈNH CAO (ĐO NGƯỠNG 6.0 - 7.5+)
    } else {
      if (score < 40) {
        estimatedBand = "5.0 - 5.5";
        bandReason = "Chưa quen với áp lực bài đọc Passage 3 và các bẫy đổi ý chuyên sâu của Listening Part 3/4.";
      } else if (score < 60) {
        estimatedBand = "6.0";
        bandReason = "Vốn từ học thuật tốt nhưng tốc độ xử lý thông tin học thuật còn chậm, dễ bị cạn giờ làm bài.";
      } else if (score < 75) {
        estimatedBand = "6.5";
        bandReason = "Phản xạ nhanh, tư duy phân tích lập luận chặt chẽ. Đạt mốc vàng chuẩn bị bước vào giai đoạn luyện đề thi thật.";
      } else if (score < 90) {
        estimatedBand = "7.0";
        bandReason = "Năng lực ngôn ngữ xuất sắc, phân biệt rõ căn cứ bài đọc và làm chủ hoàn toàn cấu trúc PEEL.";
      } else {
        estimatedBand = "7.5+";
        bandReason = "Chạm ngưỡng đỉnh cao (Chuyên gia ngôn ngữ). Sẵn sàng thi thật với mục tiêu 7.5 - 8.0.";
      }
    }

    return { estimatedBand, bandReason };
  }

  // =========================================================================
  // 3. TÍNH ĐIỂM TỔNG HỢP 4 KỸ NĂNG (25% MỖI PHẦN)
  // =========================================================================
  calculateOverallScore(liveGrammar, liveLis, liveRead, liveWBand) {
    const gRatio = (liveGrammar && liveGrammar.total > 0) ? (liveGrammar.score / liveGrammar.total) : 0;
    const lRatio = (liveLis && liveLis.total > 0) ? (liveLis.score / liveLis.total) : 0;
    const rRatio = (liveRead && liveRead.total > 0) ? (liveRead.score / liveRead.total) : 0;
    const wRatio = (parseFloat(liveWBand) || 0) / 9.0;

    const overallScore = Math.round((gRatio * 25) + (lRatio * 25) + (rRatio * 25) + (wRatio * 25));
    return Math.max(0, Math.min(100, overallScore));
  }

  // =========================================================================
  // 4. ƯỚC LƯỢNG BAND WRITING & SPEAKING SƠ BỘ TRƯỚC KHI GỌI AI
  // =========================================================================
  estimateWritingBand(task1Words, task2Words, testId) {
    const t1Words = parseInt(task1Words, 10) || 0;
    const t2Words = parseInt(task2Words, 10) || 0;

    let t1Band = t1Words === 0 ? 0.0 : (t1Words < 20 ? 2.0 : (t1Words < 50 ? 3.0 : 4.0));
    let t2Band = t2Words === 0 ? 0.0 : (t2Words < 40 ? 1.5 : (t2Words < 100 ? 3.0 : 4.0));

    let rawCombined = roundIELTS((t1Band * 1 + t2Band * 2) / 3);
    const finalBand = parseFloat(calculateSmartOverCap(rawCombined, testId));

    return {
      t1Band,
      t2Band,
      finalBand
    };
  }

  estimateSpeakingBand(totalWords, testId) {
    const words = parseInt(totalWords, 10) || 0;
    let sBand = words === 0 ? 0.0 : (words < 25 ? 2.0 : (words < 60 ? 3.0 : 4.0));
    return parseFloat(calculateSmartOverCap(sBand, testId));
  }

  /**
   * Bóc tách & chuẩn hóa mã dạng câu hỏi Reading bị sai sang chuẩn kho 101-320
   */
  extractReadingSkillTagsFromWrong(w) {
    if (!w || typeof w !== 'object') return [];
    const results = [];
    if (w.skillTag) results.push(String(w.skillTag).toUpperCase().trim());

    const meta = `${String(w.questionType || '')} ${String(w.questionGroup || '')} ${String(w.behaviorTag || '')}`.toUpperCase();
    if (meta.includes('YES') && meta.includes('NO')) results.push('YNNG');
    else if (meta.includes('TRUE') && meta.includes('FALSE')) results.push('TFNG');
    if (meta.includes('SUMMARY') && meta.includes('BOX')) results.push('SUMMARY_BOX');
    else if (meta.includes('SUMMARY')) results.push('SUMMARY_COMP');
    if (meta.includes('NOTE') || meta.includes('SENTENCE COMPLETION')) results.push('NOTE_COMP');
    if (meta.includes('MATCHING INFO')) results.push('MATCH_INFO');
    if (meta.includes('MATCHING FEATURE') || meta.includes('MATCHING NAME')) results.push('MATCH_FEATURES');
    if (meta.includes('MATCHING ENDING') || meta.includes('SENTENCE ENDING')) results.push('MATCH_ENDINGS');
    if (meta.includes('MULTIPLE CHOICE')) results.push('MCQ');

    if (w.behaviorTag) results.push(String(w.behaviorTag).trim());
    if (w.questionNum) results.push(`READ_Q${w.questionNum}`);
    return results.filter(Boolean);
  }

  // =========================================================================
  // 5. TRÍCH XUẤT BLUEPRINT LỖ HỔNG (ITEM-LEVEL ERROR PROFILE)
  // =========================================================================
  extractBlueprintProfile(testId, liveGrammar, liveRead, liveLis, liveWritingSub, liveSpkWords) {
    const failedReadingSet = new Set();
    ((liveRead && liveRead.wrongList) || []).forEach(w => {
      this.extractReadingSkillTagsFromWrong(w).forEach(tag => failedReadingSet.add(tag));
    });

    return {
      testId: testId || 'test_01',
      wrongGrammarTags: ((liveGrammar && liveGrammar.wrongList) || [])
        .map(w => w.topic || `G_Q${w.num}`)
        .filter(Boolean),
      failedReadingSkills: Array.from(failedReadingSet),
      failedListeningSkills: ((liveLis && liveLis.wrongList) || [])
        .map(w => `LIS_P${w.partNum}_Q${w.num}`)
        .filter(Boolean),
      weakWritingCriteria: (liveWritingSub && liveWritingSub.task2Words === 0) 
        ? ["TR_TASK2_MISSING", "GRA"] 
        : ["CC", "GRA"],
      weakSpeakingCriteria: (liveSpkWords < 50) 
        ? ["FC_SHORT_RESPONSE"] 
        : ["GRA"]
    };
  }
}

export const diagBandCalibrator = new DiagBandCalibrator();
