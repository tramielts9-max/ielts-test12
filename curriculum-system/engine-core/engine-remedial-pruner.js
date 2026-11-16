/**
 * curriculum-system/engine-core/engine-remedial-pruner.js
 * BỘ MÁY BÓC TÁCH BLUEPRINT CÂU SAI & BỘ LỌC CỨU BÀI KHẨN CẤP (REMEDIAL URGENT INJECTION)
 * BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ DÒNG CODE TÍNH NĂNG NÀO
 * - BÓC TÁCH TOÀN BỘ BLUEPRINT LỖ HỔNG TỪ BÀI THI DIAGNOSTIC (NGỮ PHÁP, ĐỌC, NGHE, VIẾT, NÓI)
 * - NGUYÊN TẮC CỨU BÀI TỐI CAO: GIỮ 100% ĐỐT BÀI TẬP TƯƠNG ỨNG VỚI CÂU SAI & MIỄN TRỪ HOÀN TOÀN KHỎI HEAD-CUT
 * - BẢO TOÀN LUẬT CHẶN BÀI VỠ LÒNG A1, BẢO VỆ 28 UNIT TỪ VỰNG & GỌT TỈA THEO TRẦN MỤC TIÊU
 * - CHỐNG NGHẼN KHO READING: CÂN BẰNG KHO 101-320 CHIA THEO DẠNG (P1, P2, P3) + CAMBRIDGE CHO CẢ AI VÀ FORM CHỌN BAND
 */

const READING_SKILL_CODES = [
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

export class EngineRemedialPruner {
  /**
   * Chuẩn hóa tên/tag dạng bài Reading từ AI hoặc Diagnostic về mã chuẩn của kho 101-320
   */
  static normalizeReadingSkillToken(raw = '') {
    const t = String(raw || '').trim().toUpperCase();
    if (!t) return [];
    if (READING_SKILL_CODES.includes(t)) return [t];

    const mapped = [];
    if (t.includes('TFNG') || t.includes('TRUE/FALSE') || t.includes('TRUE_FALSE') || t.includes('ĐOÁN MÒ / SAI CĂN CỨ')) {
      mapped.push('TFNG');
    }
    if (t.includes('YNNG') || t.includes('YES/NO') || t.includes('YES_NO')) {
      mapped.push('YNNG');
    }
    if (t.includes('SUMMARY_BOX') || t.includes('SUMMARY BOX')) {
      mapped.push('SUMMARY_BOX');
    } else if (t.includes('SUMMARY')) {
      mapped.push('SUMMARY_COMP');
    }
    if (t.includes('NOTE_COMP') || t.includes('NOTE COMP')) {
      mapped.push('NOTE_COMP');
    }
    if (t.includes('GAP FILL') || t.includes('GAP_FILL') || t.includes('GAP-FILL')) {
      mapped.push('NOTE_COMP', 'SUMMARY_COMP', 'SUMMARY_BOX');
    }
    if (t.includes('MATCH_INFO') || t.includes('MATCHING INFO')) {
      mapped.push('MATCH_INFO');
    }
    if (t.includes('MATCH_FEATURES') || t.includes('MATCHING NAMES') || t.includes('MATCHING FEATURES')) {
      mapped.push('MATCH_FEATURES');
    }
    if (t.includes('MATCH_ENDINGS') || t.includes('MATCHING ENDINGS') || t.includes('SENTENCE ENDINGS')) {
      mapped.push('MATCH_ENDINGS');
    }
    if (t.includes('MCQ_TWO') || t.includes('2 ANSWERS') || t.includes('TWO ANSWERS')) {
      mapped.push('MCQ_TWO');
    } else if (t.includes('MCQ') || t.includes('MULTIPLE CHOICE')) {
      mapped.push('MCQ');
    }
    return Array.from(new Set(mapped));
  }

  /**
   * Nhận diện passage level (P1 / P2 / P3) của một node Reading
   */
  static detectReadingPassageLevel(node) {
    const tags = (node?.tags || []).map(t => String(t).toUpperCase());
    const id = String(node?.id || '').toUpperCase();
    const url = String(node?.url || '').toUpperCase();

    if (tags.includes('READ_P1') || id.includes('ST1') || url.includes('/P1/') || id.endsWith('_P1')) return 'P1';
    if (tags.includes('READ_P2') || id.includes('ST2') || url.includes('/P2/') || id.endsWith('_P2')) return 'P2';
    if (tags.includes('READ_P3') || id.includes('ST3') || url.includes('/P3/') || id.endsWith('_P3')) return 'P3';
    return 'P2';
  }

  /**
   * Bóc tách toàn bộ danh sách thẻ (tags) câu sai từ Blueprint bài thi chẩn đoán
   */
  static extractRemedialTagsFromBlueprint(blueprintProfile = {}) {
    if (!blueprintProfile || typeof blueprintProfile !== 'object') return [];

    const tags = new Set();

    // 1. Tags ngữ pháp làm sai (VD: G_PAST_SIMPLE, G_IRREG_V2, G_ARTICLES)
    if (Array.isArray(blueprintProfile.wrongGrammarTags)) {
      blueprintProfile.wrongGrammarTags.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    // 2. Kỹ năng đọc sai (VD: READ_TFNG_TRAP, READ_Q05, READ_CAM..., hoặc dạng bài)
    if (Array.isArray(blueprintProfile.failedReadingSkills)) {
      blueprintProfile.failedReadingSkills.forEach(t => {
        if (t && typeof t === 'string') {
          const upper = t.trim().toUpperCase();
          tags.add(upper);
          this.normalizeReadingSkillToken(upper).forEach(norm => tags.add(norm));
        }
      });
    }

    // 3. Kỹ năng nghe sai (VD: LIS_P1_Q2, LIS_MAP_LABELLING)
    if (Array.isArray(blueprintProfile.failedListeningSkills)) {
      blueprintProfile.failedListeningSkills.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    // 4. Tiêu chí viết yếu (VD: TR_TASK2_MISSING, GRA)
    if (Array.isArray(blueprintProfile.weakWritingCriteria)) {
      blueprintProfile.weakWritingCriteria.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    // 5. Tiêu chí nói yếu (VD: FC_SHORT_RESPONSE, PRON)
    if (Array.isArray(blueprintProfile.weakSpeakingCriteria)) {
      blueprintProfile.weakSpeakingCriteria.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    return Array.from(tags);
  }

  /**
   * Kiểm tra xem một bài học cụ thể có khớp với lỗ hổng kiến thức cần cứu bài hay không
   */
  static isNodeMatchingRemedial(node, remedialTags = []) {
    if (!node || !remedialTags || remedialTags.length === 0) return false;
    const nodeTags = (node.tags || []).map(t => String(t).toUpperCase());
    const nodeId = String(node.id || '').toUpperCase();
    const nodeTitle = String(node.title || '').toUpperCase();

    return remedialTags.some(rt => {
      if (!rt) return false;
      const target = String(rt).toUpperCase().trim();
      if (!target) return false;

      // Khớp trực tiếp tag
      if (nodeTags.includes(target)) return true;

      // Khớp id hoặc từ khóa trong id
      if (nodeId && (nodeId === target || nodeId.includes(target))) return true;

      // Khớp các tiền tố ngữ pháp đặc trị
      if (target.startsWith('G_') && nodeTags.some(t => t.includes(target) || target.includes(t))) return true;

      // Khớp kỹ năng đọc (hỗ trợ cả prefix READ_ lẫn các biến thể tên dạng bài cho kho 101-320)
      if ((node.domain || '').toUpperCase() === 'READING') {
        const normalizedTargets = this.normalizeReadingSkillToken(target);
        if (normalizedTargets.length > 0 && normalizedTargets.some(nt => nodeTags.includes(nt))) {
          return true;
        }
        if (target.startsWith('READ_')) {
          if (target.includes('TFNG') && (nodeTags.includes('TFNG') || nodeTitle.includes('TFNG') || nodeTitle.includes('TRUE/FALSE'))) return true;
          if (target.includes('YNNG') && (nodeTags.includes('YNNG') || nodeTitle.includes('YES/NO'))) return true;
          if (target.includes('MAP') && nodeTitle.includes('MAP')) return true;
        }
      }

      // Khớp kỹ năng nghe
      if (target.startsWith('LIS_') && (node.domain === 'LISTENING' || node.domain === 'PRE_LISTENING')) {
        if (target.includes('P1') && (nodeTags.includes('LIS_P1') || nodeTitle.includes('PART 1'))) return true;
        if (target.includes('MAP') && nodeTitle.includes('MAP')) return true;
      }

      return false;
    });
  }

  /**
   * Lọc & cân bằng kho Reading (101-320 Skill + Collection + Cam) theo trình độ và định hướng AI,
   * tránh tình trạng giữ toàn bộ 273 bài làm Chặng 2 kẹt cứng ở P1 (st-101..114).
   */
  static filterBalancedReadingNodes(readingNodes = [], sBand = 0.0, tBand = 7.0, aiOptions = {}) {
    if (!Array.isArray(readingNodes) || readingNodes.length === 0) return [];

    const strategy = String(aiOptions.reading_strategy || (sBand >= 6.5 ? 'CAM_EXAM_FIRST' : (sBand < 5.5 ? 'SKILL_FIRST' : 'BALANCED_P1_P2_P3'))).toUpperCase();
    const rawFocusSkills = Array.isArray(aiOptions.reading_focus_skills) ? aiOptions.reading_focus_skills : [];
    const focusSkills = Array.from(new Set(rawFocusSkills.flatMap(s => this.normalizeReadingSkillToken(s))));
    const allowedLevels = (Array.isArray(aiOptions.reading_passage_levels) && aiOptions.reading_passage_levels.length > 0)
      ? aiOptions.reading_passage_levels.map(l => String(l).toUpperCase())
      : (sBand >= 6.0 ? ['P2', 'P3'] : ['P1', 'P2', 'P3']);

    // Giới hạn chỉ tiêu bài sưu tầm để Chặng 2 (28 ngày) + Chặng 4 review (6 ngày) đi qua đủ cả P1, P2, P3 & Cam
    const skillQuota = Math.max(12, Math.min(36, parseInt(aiOptions.reading_skill_quota, 10) || 20));
    const collQuota = strategy === 'CAM_EXAM_FIRST' ? 6 : 12;

    const remedialSkills = [];
    const matchedFocusSkills = [];
    const otherSkills = [];
    const collectionNodes = [];
    const camNodes = [];

    readingNodes.forEach(node => {
      const id = String(node.id || '').toUpperCase();
      const tags = (node.tags || []).map(t => String(t).toUpperCase());
      const titleLower = (node.title || '').toLowerCase();
      const stg = node.stage || 'S3';
      const pLevel = this.detectReadingPassageLevel(node);

      // Lọc Cam theo Band (vẫn bảo vệ nếu là remedial)
      if (!id.startsWith('S3_SKILL_') && !id.startsWith('S3_READ_COLL_')) {
        if (!node.isRemedial) {
          if (sBand >= 6.0 && titleLower.includes('có mớm')) return;
          if (tBand <= 5.5 && stg === 'S4') return;
        }
        camNodes.push(node);
        return;
      }

      // Phân loại kho Skill 101-320
      if (id.startsWith('S3_SKILL_') || tags.includes('READ_SKILL')) {
        const matchesFocus = focusSkills.length > 0 && focusSkills.some(fs => tags.includes(fs));
        if (node.isRemedial) {
          remedialSkills.push(node);
        } else if (allowedLevels.includes(pLevel)) {
          if (matchesFocus) matchedFocusSkills.push(node);
          else otherSkills.push(node);
        }
        return;
      }

      // Phân loại kho Full Collection 101-320
      if (id.startsWith('S3_READ_COLL_') || tags.includes('READ_COLLECTION')) {
        if (node.isRemedial || allowedLevels.includes(pLevel)) {
          collectionNodes.push(node);
        }
      }
    });

    // Rải đều theo từng Passage (P1, P2, P3) & từng dạng kỹ năng để không bị dồn hết vào P1
    const interleaveByPassage = (list, limit) => {
      const buckets = { P1: [], P2: [], P3: [] };
      list.forEach(item => {
        const lvl = this.detectReadingPassageLevel(item);
        (buckets[lvl] || buckets.P2).push(item);
      });

      const order = allowedLevels.filter(l => buckets[l] && buckets[l].length > 0);
      if (order.length === 0) return list.slice(0, limit);

      const picked = [];
      let cursor = 0;
      while (picked.length < limit) {
        let addedInRound = false;
        for (const lvl of order) {
          if (picked.length >= limit) break;
          if (buckets[lvl][cursor]) {
            picked.push(buckets[lvl][cursor]);
            addedInRound = true;
          }
        }
        if (!addedInRound) break;
        cursor++;
      }
      return picked;
    };

    const selectedSkills = [];
    const seenIds = new Set();
    const pushUnique = (arr, limit) => {
      for (const item of arr) {
        if (selectedSkills.length >= limit) break;
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          selectedSkills.push(item);
        }
      }
    };

    // Ưu tiên: 1. Bài Remedial (tối đa đủ rải đều các dạng yếu) -> 2. Focus Skills từ AI -> 3. Các dạng còn lại
    const balancedRemedial = interleaveByPassage(remedialSkills, skillQuota);
    pushUnique(balancedRemedial, skillQuota);

    if (selectedSkills.length < skillQuota) {
      const balancedFocus = interleaveByPassage(matchedFocusSkills, skillQuota - selectedSkills.length);
      pushUnique(balancedFocus, skillQuota);
    }

    if (selectedSkills.length < skillQuota) {
      const balancedOthers = interleaveByPassage(otherSkills, skillQuota - selectedSkills.length);
      pushUnique(balancedOthers, skillQuota);
    }

    const selectedCollections = interleaveByPassage(collectionNodes, collQuota);

    if (strategy === 'CAM_EXAM_FIRST') {
      return [...camNodes, ...selectedSkills, ...selectedCollections];
    }
    if (strategy === 'SKILL_FIRST') {
      return [...selectedSkills, ...selectedCollections, ...camNodes];
    }
    return [...selectedSkills, ...selectedCollections, ...camNodes];
  }

  /**
   * Lọc kho bài tập theo Band điểm và can thiệp cứu bài khẩn cấp:
   * - CỨU BÀI KHẨN CẤP: Giữ lại 100% bài học mà học sinh đã làm sai ở bài test, cấm cắt đầu.
   * - CHẶN A1: Chặn bài vỡ lòng nếu trình độ học sinh đã vượt ngưỡng A1.
   * - TỪ VỰNG: Giữ nguyên 28 Unit nếu có chỉ đạo FULL_100_PERCENT.
   * - GỌT ĐẦU & ĐUÔI: Loại bỏ bài quá dễ hoặc quá khó so với mục tiêu.
   * - CÂN BẰNG READING: Phân phối hợp lý bộ 101-320 theo dạng & Passage thay vì dồn 273 bài.
   */
  static pruneCurriculumByBands(allNodes = [], startBand = 0.0, targetBand = 7.0, aiOptions = {}) {
    if (!Array.isArray(allNodes)) return [];

    const sBand = parseFloat(startBand) || 0.0;
    const tBand = Math.min(7.0, parseFloat(targetBand) || 7.0);

    // Bóc tách tags cứu bài từ blueprintProfile hoặc các trường yếu
    const blueprintProfile = aiOptions.blueprintProfile || aiOptions.details?.blueprintProfile || {};
    const blueprintRemedialTags = this.extractRemedialTagsFromBlueprint(blueprintProfile);

    const weakTags = Array.from(new Set([
      ...(aiOptions.retained_weak_tags || []),
      ...(aiOptions.weak_tags || []),
      ...(aiOptions.reading_focus_skills || []),
      ...blueprintRemedialTags
    ].map(t => String(t).toUpperCase().trim()).filter(Boolean)));

    const prunedTags = (aiOptions.pruned_tags || aiOptions.mastered_tags || []).map(t => String(t).toUpperCase().trim());
    const excludedDomains = (aiOptions.pruned_domains || aiOptions.excluded_domains || []).map(d => String(d).toUpperCase());
    const focusDomains = (aiOptions.focus_domains || []).map(d => String(d).toUpperCase());
    const isFullVocab = (aiOptions.vocab_requirement === 'FULL_100_PERCENT');
    const prohibitedLevels = aiOptions.quota_policy?.prohibited_levels || [];

    const nonReadingRetained = [];
    const readingCandidates = [];

    allNodes.forEach((rawNode, idx) => {
      if (!rawNode) return;
      // Luôn sao chép sạch node để không làm ô nhiễm cờ isRemedial sang học viên khác
      const node = { ...rawNode, isRemedial: false, remedialReason: '' };
      const d = (node.domain || '').toUpperCase();
      const nodeTags = (node.tags || []).map(t => String(t).toUpperCase());
      const stg = node.stage || 'S1';
      const titleLower = (node.title || '').toLowerCase();
      const idUpper = (node.id || '').toUpperCase();

      const isRemedial = this.isNodeMatchingRemedial(node, weakTags);

      // Tách riêng Reading thực hành (không phải Pre-Reading) để xử lý cân bằng bộ 101-320 + Cam
      if (d === 'READING') {
        if (excludedDomains.some(ex => d === ex || d.startsWith(ex))) return;
        if (isRemedial) {
          node.isRemedial = true;
          node.remedialReason = "Đặc trị lỗi sai / dạng bài trọng tâm Reading (101-320)";
          readingCandidates.push(node);
          return;
        }
        // Nếu mục tiêu <= 5.0: vẫn mở khóa nhóm Passage 1 (st-101..120) của bộ 101-320 cho học sinh làm quen
        if (tBand <= 5.0) {
          const pLevel = this.detectReadingPassageLevel(node);
          if (pLevel === 'P1' && (idUpper.startsWith('S3_SKILL_') || idUpper.startsWith('S3_READ_COLL_'))) {
            readingCandidates.push(node);
          }
          return;
        }
        readingCandidates.push(node);
        return;
      }

      // 🔴 NGUYÊN TẮC CỨU BÀI TỐI CAO CHO CÁC DOMAIN KHÁC:
      // NẾU LÀ ĐỐT CỨU BÀI DO HỌC SINH LÀM SAI TRONG BÀI THI -> BẮT BUỘC GIỮ LẠI 100%, CẤM CẮT ĐẦU!
      if (isRemedial) {
        node.isRemedial = true;
        node.remedialReason = "Đặc trị lỗi sai bài thi chẩn đoán (Diagnostic Blueprint)";
        nonReadingRetained.push(node);
        return;
      }

      // 1. LUẬT LỌC TRÌNH ĐỘ CỦA AI: CHẶN CÁC BÀI VỠ LÒNG NẾU THUỘC PROHIBITED LEVELS
      if (prohibitedLevels.includes("A1")) {
        const isA1Content = idUpper.includes('_A1') || titleLower.includes(' a1') || nodeTags.some(t => String(t).includes('_A1'));
        if (isA1Content && !isRemedial) {
          return;
        }
      }

      // 2. BẢO TỒN 100% KHO TỪ VỰNG 28 UNIT KHI CÓ CHỈ ĐẠO
      if (isFullVocab && d === 'VOCABULARY') {
        nonReadingRetained.push(node);
        return;
      }

      // 3. CẮT BỎ CÁC DOMAIN BỊ AI LOẠI TRỪ (VÍ DỤ: PRE_READING)
      if (excludedDomains.some(ex => d === ex || d.startsWith(ex) || ex.includes(d))) {
        return;
      }

      // 4. CẮT BỎ CÁC TAGS RÂU RIA AI ĐÁNH GIÁ ĐÃ VỮNG
      if (prunedTags.length > 0 && nodeTags.length > 0 && nodeTags.every(t => prunedTags.includes(t))) {
        return;
      }

      // 5. BẢO VỆ CÁC DOMAIN TRỌNG TÂM ĐỂ DÀNH NGUYÊN LIỆU CHO CÁC CHẶNG
      if (focusDomains.some(fc => d === fc || d.includes(fc))) {
        if (tBand <= 5.5 && stg === 'S4') return;
        nonReadingRetained.push(node);
        return;
      }

      // 6. CẮT ĐẦU THEO BAND XUẤT PHÁT (HEAD-CUT) - CHỈ ÁP DỤNG NẾU KHÔNG PHẢI BÀI CỨU
      if (sBand >= 3.5 && stg === 'S1') return;
      if (sBand >= 4.5 && stg === 'S1') return;
      if (sBand >= 5.0 && stg === 'S2' && !d.includes('PRE_WRITING')) return;
      if (sBand >= 5.5 && stg === 'S2') return;
      if (sBand >= 6.0 && stg === 'S3' && (titleLower.includes('có mớm') || d.includes('PRE_'))) return;
      if (sBand >= 6.5 && stg === 'S3') return;

      // 7. CẮT ĐUÔI THEO BAND MỤC TIÊU (TAIL-CUT)
      if (tBand <= 5.0 && (stg === 'S3' || stg === 'S4')) return;
      if (tBand <= 5.5 && stg === 'S4') return;
      if (tBand <= 6.0 && stg === 'S4') return;
      if (tBand <= 6.5 && stg === 'S4' && idx % 3 === 0) return;

      nonReadingRetained.push(node);
    });

    const balancedReadingRetained = this.filterBalancedReadingNodes(readingCandidates, sBand, tBand, aiOptions);
    return [...nonReadingRetained, ...balancedReadingRetained];
  }
}
