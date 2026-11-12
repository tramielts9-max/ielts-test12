/**
 * curriculum-system/engine-core/engine-phase-scheduler.js
 * BỘ MÁY BĂM LỊCH 5 CHẶNG TUẦN TỰ & VÒNG LẶP ÔN TẬP SPACED REPETITION 3 NGÀY
 * BẢN FULL ĐẦY ĐỦ 100% - TÍCH HỢP ĐỐT VIDEO LÝ THUYẾT ĐỨNG ĐẦU & TỰ ĐỘNG GẮP 5 BÀI TẬP ĐI KÈM
 * - CHẶNG 1: DỒN 100% BÀI CỨU CÂU SAI ĐẶC TRỊ + VIDEO LÝ THUYẾT NGỮ PHÁP LÊN ĐẦU
 * - CHẶNG 2: VIDEO LÝ THUYẾT CHIẾN THUẬT READING + 100% TỪ VỰNG 28 UNIT + BÀI TẬP ĐỀ CAMBRIDGE
 * - CHẶNG 3: VIDEO CHIẾN THUẬT LISTENING + ĐẨY NHANH LISTENING CAMBRIDGE THỰC CHIẾN
 * - CHẶNG 4: VIDEO LÝ THUYẾT WRITING + THỰC CHIẾN (75% ĐỀ THI THẬT) + ÔN TẬP READING 3 NGÀY
 * - CHẶNG 5: VIDEO CHIẾN THUẬT SPEAKING + VỀ ĐÍCH SPEAKING FORECAST + ÔN TẬP LISTENING 3 NGÀY
 * - BẢO LƯU THUẬT TOÁN BĂM LỊCH XOAY VÒNG TIÊU CHUẨN (SPIRAL CALENDAR) DỰ PHÒNG
 */

import { EngineSessionMatrix } from './engine-session-matrix.js';

export class EnginePhaseScheduler {
  /**
   * Băm lịch học theo 5 Chặng tuần tự:
   * Phân bổ thông minh bài cứu, Đốt Video Lý thuyết, 28 Unit từ vựng, hạn ngạch 75% đề thi thật và vòng lặp duy trì 3 ngày.
   */
  static generateSequentialPhasesCalendar(retainedNodes = [], targetDays = 91, dailyTargetMinutes = 90, speedProfile = 'normal', stats = {}, aiOptions = {}) {
    const calendarDays = [];
    const quota = aiOptions.quota_policy || {};
    const reviewInterval = quota.review_interval_days || 3;

    // 1. Phân loại hàng đợi bài tập chi tiết, bao gồm cả các Đốt Video Lý thuyết
    const qTheoryGrammar = [];
    const qRemedialGrammar = [];
    const qStandardGrammar = [];
    const qVocab = [];
    const qTheoryReading = [];
    const qReading = [];
    const qTheoryListening = [];
    const qPreListening = [];
    const qOfficialListening = [];
    const qTheoryWriting = [];
    const qPreWriting = [];
    const qOfficialWritingT1 = [];
    const qOfficialWritingT2 = [];
    const qTheorySpeaking = [];
    const qPreSpeaking = [];
    const qOfficialSpeaking = [];

    // Sắp xếp bài từ vựng đúng thứ tự Unit 1 -> 10 (300 từ) rồi đến Unit 1 -> 18 (540 từ)
    const rawVocab = (retainedNodes || []).filter(n => n && (n.domain || '').toUpperCase() === 'VOCABULARY');
    rawVocab.sort((a, b) => {
      const getNum = id => parseInt(String(id).replace(/[^0-9]/g, ''), 10) || 0;
      return getNum(a.id) - getNum(b.id);
    });
    rawVocab.forEach(n => qVocab.push({ ...n, benefit: n.benefit || EngineSessionMatrix.generateBenefit(n) }));

    (retainedNodes || []).forEach(node => {
      if (!node) return;
      const d = (node.domain || '').toUpperCase();
      const isTheory = !!node.isTheoryVideo || node.type === 'THEORY';

      const nWithBenefit = {
        ...node,
        benefit: node.benefit || EngineSessionMatrix.generateBenefit(node),
        title: node.isRemedial ? `[🚨 ĐẶC TRỊ CÂU SAI] ${node.title}` : node.title
      };

      if (d === 'GRAMMAR') {
        if (isTheory) qTheoryGrammar.push(nWithBenefit);
        else if (node.isRemedial) qRemedialGrammar.push(nWithBenefit);
        else qStandardGrammar.push(nWithBenefit);
      } else if (d === 'READING' || d === 'PRE_READING') {
        if (isTheory) qTheoryReading.push(nWithBenefit);
        else if (node.isRemedial) qReading.unshift(nWithBenefit); // Đưa bài đọc yếu lên đầu
        else qReading.push(nWithBenefit);
      } else if (d === 'PRE_LISTENING') {
        qPreListening.push(nWithBenefit);
      } else if (d === 'LISTENING') {
        if (isTheory) qTheoryListening.push(nWithBenefit);
        else if (node.isRemedial) qOfficialListening.unshift(nWithBenefit);
        else qOfficialListening.push(nWithBenefit);
      } else if (d.includes('PRE_WRITING')) {
        qPreWriting.push(nWithBenefit);
      } else if (d === 'WRITING_T1') {
        if (isTheory) qTheoryWriting.push(nWithBenefit);
        else qOfficialWritingT1.push(nWithBenefit);
      } else if (d === 'WRITING_T2') {
        if (isTheory) qTheoryWriting.push(nWithBenefit);
        else qOfficialWritingT2.push(nWithBenefit);
      } else if (d === 'PRE_SPEAKING') {
        qPreSpeaking.push(nWithBenefit);
      } else if (d === 'SPEAKING') {
        if (isTheory) qTheorySpeaking.push(nWithBenefit);
        else qOfficialSpeaking.push(nWithBenefit);
      }
    });

    // Gom hàng đợi Grammar: VIDEO LÝ THUYẾT & BÀI CỨU XẾP ĐẦU TIÊN
    const qGrammar = [...qTheoryGrammar, ...qRemedialGrammar, ...qStandardGrammar];

    // Kho lưu trữ đề thi đã học để phục vụ Vòng lặp Ôn tập Spaced Repetition
    const reviewPoolReading = qReading.filter(n => !n.isTheoryVideo);
    const reviewPoolListening = qOfficialListening.filter(n => !n.isTheoryVideo);

    // 2. Tính toán phân bổ số ngày cho từng Chặng (Tổng cộng chuẩn targetDays)
    const daysPhase1 = Math.min(12, Math.max(6, Math.ceil(qGrammar.length / 2)));
    const daysPhase2 = qVocab.length > 0 ? qVocab.length : 28;
    const daysPhase3 = 16;
    const daysPhase4 = 19;
    const daysPhase5 = Math.max(10, targetDays - (daysPhase1 + daysPhase2 + daysPhase3 + daysPhase4));

    const pickFromQueue = (queue) => {
      if (!queue || queue.length === 0) return null;
      const task = queue.shift();
      const dur = task.duration?.[speedProfile] || task.duration?.normal || 25;
      return { ...task, assignedDurationMinutes: dur };
    };

    // Hàm phụ trợ: Bốc đúng số lượng bài tập thực hành theo Tag dạng bài của Video Lý Thuyết
    const pickMatchingExercises = (exerciseQueue, targetTag, count = 5) => {
      if (!exerciseQueue || exerciseQueue.length === 0 || count <= 0) return [];
      const matched = [];
      const remaining = [];

      for (const item of exerciseQueue) {
        const itemTags = (item.tags || []).map(t => String(t).toUpperCase());
        const tagToMatch = String(targetTag || '').toUpperCase();
        const isMatch = tagToMatch && (itemTags.includes(tagToMatch) || (item.title || '').toUpperCase().includes(tagToMatch));

        if (isMatch && matched.length < count) {
          const dur = item.duration?.[speedProfile] || item.duration?.normal || 20;
          matched.push({ ...item, assignedDurationMinutes: dur });
        } else {
          remaining.push(item);
        }
      }

      // Cập nhật lại hàng đợi sau khi đã bốc bài khớp
      exerciseQueue.length = 0;
      exerciseQueue.push(...remaining);

      // Nếu không đủ bài khớp dạng, bốc các bài tiếp theo trong hàng đợi cho đủ số lượng
      while (matched.length < count && exerciseQueue.length > 0) {
        const fallbackTask = pickFromQueue(exerciseQueue);
        if (fallbackTask) matched.push(fallbackTask);
      }

      return matched;
    };

    let currentDayNum = 1;

    // -----------------------------------------------------------------------
    // CHẶNG 1: NỀN TẢNG NGỮ PHÁP (ƯU TIÊN LÝ THUYẾT & CỨU CÂU SAI ĐẶC TRỊ)
    // -----------------------------------------------------------------------
    for (let i = 0; i < daysPhase1 && currentDayNum <= targetDays; i++) {
      const dayTasks = [];
      let mins = 0;

      while (mins < dailyTargetMinutes && qGrammar.length > 0) {
        const task = pickFromQueue(qGrammar);
        if (task) {
          dayTasks.push(task);
          mins += task.assignedDurationMinutes;
        }
      }

      if (dayTasks.length === 0) {
        dayTasks.push({
          id: `S2_GRAM_REV_${currentDayNum}`,
          stage: "S2", domain: "GRAMMAR", type: "PRACTICE",
          title: `Tổng ôn & Triệt tiêu lỗi câu phức / Thì quá khứ #${i + 1}`,
          benefit: "Luyện phản xạ chuyển đổi câu chủ động sang bị động và sử dụng mệnh đề quan hệ.",
          assignedDurationMinutes: 60,
          url: "grammar/index-g.html"
        });
        mins = 60;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_1_GRAMMAR",
        phaseName: "Chặng 1: Nền Tảng Ngữ Pháp & Cứu Lỗi Sai Diagnostic",
        phaseDesc: "Tập trung triệt tiêu toàn bộ lỗi chia thì, động từ bất quy tắc và câu phức bị sai trong bài thi đầu vào.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    // -----------------------------------------------------------------------
    // CHẶNG 2: READING & 100% KHO TỪ VỰNG (ƯU TIÊN VIDEO CHIẾN THUẬT LÊN ĐẦU + 5 BÀI TẬP)
    // -----------------------------------------------------------------------
    for (let i = 0; i < daysPhase2 && currentDayNum <= targetDays; i++) {
      const dayTasks = [];
      let mins = 0;

      // 1. Nếu có Video Lý Thuyết Reading Thầy Phúc -> BẮT BUỘC ĐỨNG ĐẦU TIÊN
      if (qTheoryReading.length > 0) {
        const thTask = pickFromQueue(qTheoryReading);
        if (thTask) {
          dayTasks.push(thTask);
          mins += thTask.assignedDurationMinutes;

          // Tự động gắp bài tập tương ứng dạng bài đó (chỉ tiêu gắp tối đa 2 bài reading dài/ngày để không quá tải 90p)
          const targetExCount = thTask.targetExerciseCount ? Math.min(2, thTask.targetExerciseCount) : 1;
          const matchingExercises = pickMatchingExercises(qReading, thTask.targetExerciseTag || thTask.categoryTag, targetExCount);
          matchingExercises.forEach(ex => {
            dayTasks.push(ex);
            mins += ex.assignedDurationMinutes;
          });
        }
      }

      // 2. Đúng 1 Unit từ vựng tuần tự (Unit 1 đến 28)
      if (qVocab.length > 0) {
        const vTask = pickFromQueue(qVocab);
        if (vTask) {
          dayTasks.push(vTask);
          mins += vTask.assignedDurationMinutes;
        }
      }

      // 3. Nếu chưa có bài Reading trong ngày -> Chạy 1 bài Reading Cambridge thông thường
      const hasReadingPractice = dayTasks.some(t => (t.domain || '').toUpperCase() === 'READING' && !t.isTheoryVideo);
      if (!hasReadingPractice && mins < dailyTargetMinutes) {
        const rTask = pickFromQueue(qReading);
        if (rTask) {
          dayTasks.push(rTask);
          mins += rTask.assignedDurationMinutes;
        } else {
          dayTasks.push({
            id: `REV_READ_${currentDayNum}`,
            stage: "S4", domain: "READING", type: "TEST",
            title: `Reading Cambridge Thực Chiến: Giải Passage 3 dưới áp lực 20 phút`,
            benefit: "Rèn kỹ thuật xử lý dạng bài khó Summary Completion và True/False/Not Given.",
            assignedDurationMinutes: 45,
            url: "reading/reading.html"
          });
          mins += 45;
        }
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_2_READING_VOCAB",
        phaseName: "Chặng 2: Đột Phá Reading & Quét Sạch 100% Từ Vựng (28 Unit)",
        phaseDesc: "Xem video chiến thuật độc quyền Thầy Phúc, cày sạch 28 Unit từ vựng và giải đề Reading chuẩn phòng thi.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    // -----------------------------------------------------------------------
    // CHẶNG 3: LISTENING THỰC CHIẾN (ƯU TIÊN VIDEO CHIẾN THUẬT NGHE LÊN ĐẦU)
    // -----------------------------------------------------------------------
    for (let i = 0; i < daysPhase3 && currentDayNum <= targetDays; i++) {
      const dayTasks = [];
      let mins = 0;

      // 1. Video Lý Thuyết Listening (nếu có) đứng đầu
      if (qTheoryListening.length > 0) {
        const thTask = pickFromQueue(qTheoryListening);
        if (thTask) {
          dayTasks.push(thTask);
          mins += thTask.assignedDurationMinutes;
        }
      }

      // 2. Pre-Listening những ngày đầu
      if (qPreListening.length > 0 && i < 5 && mins < dailyTargetMinutes) {
        const pTask = pickFromQueue(qPreListening);
        if (pTask) { dayTasks.push(pTask); mins += pTask.assignedDurationMinutes; }
      }

      // 3. Listening Cambridge thực chiến
      while (mins < dailyTargetMinutes && qOfficialListening.length > 0) {
        const lTask = pickFromQueue(qOfficialListening);
        if (lTask) { dayTasks.push(lTask); mins += lTask.assignedDurationMinutes; }
      }

      if (dayTasks.length === 0) {
        dayTasks.push({
          id: `REV_LIS_${currentDayNum}`,
          stage: "S4", domain: "LISTENING", type: "TEST",
          title: `Listening Cambridge 1.1x: Bẫy Matching Features & Chuyển ý Part 2/Part 3`,
          benefit: "Luyện phản xạ bắt từ khóa khi người nói đảo chiều và trị tật mất dấu track âm thanh.",
          assignedDurationMinutes: 45,
          url: "listening/listening.html"
        });
        mins = 45;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_3_LISTENING",
        phaseName: "Chặng 3: Chiến Thuật Listening & Trị Bẫy Đảo Chiều",
        phaseDesc: "Rèn kỹ năng bám dấu bài nghe, xem bài giảng phương pháp và triệt tiêu lỗi bỏ trống câu Part 2/Part 3.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    // -----------------------------------------------------------------------
    // CHẶNG 4: THỰC CHIẾN WRITING (75% ĐỀ THI THẬT TASK 1/TASK 2 + ÔN TẬP 3 NGÀY)
    // -----------------------------------------------------------------------
    for (let i = 0; i < daysPhase4 && currentDayNum <= targetDays; i++) {
      const dayTasks = [];
      let mins = 0;
      const isReviewDay = (reviewInterval > 0 && (i + 1) % reviewInterval === 0);

      // 1. Video Lý Thuyết Writing (nếu có) đứng đầu
      if (qTheoryWriting.length > 0) {
        const thTask = pickFromQueue(qTheoryWriting);
        if (thTask) {
          dayTasks.push(thTask);
          mins += thTask.assignedDurationMinutes;
        }
      }

      // 2. Chu kỳ 3 ngày ôn tập duy trì Reading
      if (isReviewDay) {
        const revTask = reviewPoolReading.length > 0 
          ? { ...reviewPoolReading[(i * 2) % reviewPoolReading.length], assignedDurationMinutes: 40, title: `[🔄 ÔN TẬP DUY TRÌ] ${reviewPoolReading[(i * 2) % reviewPoolReading.length].title}` }
          : {
            id: `REV_READ_MAINT_${currentDayNum}`, stage: "S4", domain: "READING", type: "TEST",
            title: `[🔄 ÔN TẬP DUY TRÌ] Giải Đề Reading Cam Bấm Giờ 40 Phút`,
            benefit: "Giữ tay định vị từ khóa và phản xạ làm bài thi đọc hiểu dưới áp lực thời gian.",
            assignedDurationMinutes: 40, url: "reading/reading.html"
          };
        dayTasks.push(revTask);
        mins += revTask.assignedDurationMinutes;
      }

      if (qPreWriting.length > 0 && i < 4 && mins < dailyTargetMinutes) {
        const pwTask = pickFromQueue(qPreWriting);
        if (pwTask) { dayTasks.push(pwTask); mins += pwTask.assignedDurationMinutes; }
      }

      if (qOfficialWritingT2.length > 0 && mins < dailyTargetMinutes) {
        const wt2Task = pickFromQueue(qOfficialWritingT2);
        if (wt2Task) { dayTasks.push(wt2Task); mins += wt2Task.assignedDurationMinutes; }
      }

      if (qOfficialWritingT1.length > 0 && mins < dailyTargetMinutes) {
        const wt1Task = pickFromQueue(qOfficialWritingT1);
        if (wt1Task) { dayTasks.push(wt1Task); mins += wt1Task.assignedDurationMinutes; }
      }

      if (dayTasks.length === 0) {
        dayTasks.push({
          id: `REV_WRT2_FINAL_${currentDayNum}`, stage: "S4", domain: "WRITING_T2", type: "PRACTICE",
          title: `Writing Task 2 Độc Lập: Viết luận 250 từ chuẩn PEEL (Bấm giờ 40 phút)`,
          benefit: "Tự lên dàn ý và triển khai luận điểm độc lập, cai nghiện hoàn toàn thói quen ngâm bài mẫu.",
          assignedDurationMinutes: 50, url: "writing task 2/index-t2.html"
        });
        mins = 50;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_4_WRITING",
        phaseName: "Chặng 4: Thực Chiến Writing Task 1 & Task 2 (Cai Nghiện Bài Mẫu)",
        phaseDesc: "Tối thiểu 75% thời lượng viết bài luận Task 2 và biểu đồ Task 1 bấm giờ, kết hợp ôn đề Reading mỗi 3 ngày.",
        nodes: dayTasks
      });
      currentDayNum++;
    }

    // -----------------------------------------------------------------------
    // CHẶNG 5: VỀ ĐÍCH BÙNG NỔ SPEAKING (100% ĐỀ THI FORECAST + ÔN TẬP 3 NGÀY)
    // -----------------------------------------------------------------------
    let dayInPhase5 = 1;
    while (currentDayNum <= targetDays) {
      const dayTasks = [];
      let mins = 0;
      const isReviewDay = (reviewInterval > 0 && dayInPhase5 % reviewInterval === 0);

      // 1. Video Lý Thuyết Speaking (nếu có) đứng đầu
      if (qTheorySpeaking.length > 0) {
        const thTask = pickFromQueue(qTheorySpeaking);
        if (thTask) {
          dayTasks.push(thTask);
          mins += thTask.assignedDurationMinutes;
        }
      }

      // 2. Chu kỳ 3 ngày ôn tập duy trì Listening
      if (isReviewDay) {
        const revLisTask = reviewPoolListening.length > 0
          ? { ...reviewPoolListening[(dayInPhase5 * 3) % reviewPoolListening.length], assignedDurationMinutes: 30, title: `[🔄 ÔN TẬP DUY TRÌ] ${reviewPoolListening[(dayInPhase5 * 3) % reviewPoolListening.length].title}` }
          : {
            id: `REV_LIS_MAINT_${currentDayNum}`, stage: "S4", domain: "LISTENING", type: "TEST",
            title: `[🔄 ÔN TẬP DUY TRÌ] Nghe Lại 1 Đề Listening Cam 1.1x Bấm Giờ 30 Phút`,
            benefit: "Duy trì phản xạ bắt âm thanh và độ nhạy bám dấu câu hỏi trước ngày thi thật.",
            assignedDurationMinutes: 30, url: "listening/listening.html"
          };
        dayTasks.push(revLisTask);
        mins += revLisTask.assignedDurationMinutes;
      }

      if (qPreSpeaking.length > 0 && mins < dailyTargetMinutes) {
        const psTask = pickFromQueue(qPreSpeaking);
        if (psTask) {
          psTask.assignedDurationMinutes = 20;
          dayTasks.push(psTask);
          mins += psTask.assignedDurationMinutes;
        }
      }

      while (mins < dailyTargetMinutes && qOfficialSpeaking.length > 0) {
        const spkTask = pickFromQueue(qOfficialSpeaking);
        if (spkTask) {
          spkTask.assignedDurationMinutes = 35;
          dayTasks.push(spkTask);
          mins += spkTask.assignedDurationMinutes;
        }
      }

      if (dayTasks.length <= 1) {
        dayTasks.push({
          id: `REV_SPK_FORECAST_${currentDayNum}`, stage: "S4", domain: "SPEAKING", type: "PRACTICE",
          title: `Speaking Part 2 & Part 3 Forecast: Nói liên tục 2 phút theo chủ đề thi thật`,
          benefit: "Rèn phản xạ kéo dài câu trả lời dứt khoát, triệt tiêu tật đệm 'like', 'yeah' và lỗi nhảy thì lung tung.",
          assignedDurationMinutes: 35, url: "speaking/index-s.html"
        });
        mins = 35;
      }

      calendarDays.push({
        dayNumber: currentDayNum,
        totalMinutes: mins,
        phaseId: "PHASE_5_SPEAKING",
        phaseName: "Chặng 5: Về Đích - Đột Phá Speaking & Shadowing Toàn Diện",
        phaseDesc: "100% các ngày luyện đề thi thật Forecast Part 1/2/3, Shadowing ấm giọng và ôn đề Listening định kỳ 3 ngày.",
        nodes: dayTasks
      });
      currentDayNum++;
      dayInPhase5++;
    }

    return {
      totalDays: calendarDays.length,
      estimatedMonths: stats.months || 3,
      dailySchedule: calendarDays
    };
  }

  /**
   * Băm lịch học xoay vòng (Spiral): Dành cho chế độ tổng hợp 4 kỹ năng xen kẽ
   */
  static generateStandardSpiralCalendar(retainedNodes = [], targetDays = 91, dailyTargetMinutes = 90, speedProfile = 'normal', stats = {}, aiOptions = {}) {
    const calendarDays = [];
    const qGrammar = [];
    const qVocab = [];
    const qPreLis = [];
    const qOffLis = [];
    const qPreRead = [];
    const qOffRead = [];
    const qPreWrite = [];
    const qOffWrite = [];
    const qPreSpk = [];
    const qOffSpk = [];
    const qMock = [];

    (retainedNodes || []).forEach(node => {
      if (!node) return;
      const d = (node.domain || '').toUpperCase();
      const nWithBenefit = { ...node, benefit: node.benefit || EngineSessionMatrix.generateBenefit(node) };

      if (d === 'GRAMMAR') qGrammar.push(nWithBenefit);
      else if (d === 'VOCABULARY') qVocab.push(nWithBenefit);
      else if (d === 'PRE_LISTENING') qPreLis.push(nWithBenefit);
      else if (d === 'LISTENING') qOffLis.push(nWithBenefit);
      else if (d === 'PRE_READING') qPreRead.push(nWithBenefit);
      else if (d === 'READING') qOffRead.push(nWithBenefit);
      else if (d.includes('PRE_WRITING')) qPreWrite.push(nWithBenefit);
      else if (d.includes('WRITING')) qOffWrite.push(nWithBenefit);
      else if (d === 'PRE_SPEAKING') qPreSpk.push(nWithBenefit);
      else if (d === 'SPEAKING') qOffSpk.push(nWithBenefit);
      else if (d === 'MOCK_TEST') qMock.push(nWithBenefit);
    });

    const pickTask = (queue, maxAllowed = 40) => {
      if (!queue || queue.length === 0) return null;
      const candidate = queue.shift();
      const dur = candidate.duration?.[speedProfile] || candidate.duration?.normal || 20;
      return { ...candidate, assignedDurationMinutes: dur };
    };

    for (let currentDay = 1; currentDay <= targetDays; currentDay++) {
      let dayMinutes = 0;
      const dayNodes = [];

      if (qGrammar.length > 0) {
        const t = pickTask(qGrammar, 30);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }
      if (dayMinutes < dailyTargetMinutes && (qPreLis.length > 0 || qOffLis.length > 0)) {
        const t = pickTask(qPreLis.length > 0 ? qPreLis : qOffLis, 35);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }
      if (dayMinutes < dailyTargetMinutes && (qVocab.length > 0 || qPreRead.length > 0 || qOffRead.length > 0)) {
        const t = pickTask(currentDay % 2 === 1 && qVocab.length > 0 ? qVocab : (qPreRead.length > 0 ? qPreRead : qOffRead), 35);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }
      if (dayMinutes < dailyTargetMinutes && (qPreWrite.length > 0 || qOffWrite.length > 0)) {
        const t = pickTask(qPreWrite.length > 0 ? qPreWrite : qOffWrite, 45);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }
      if (dayMinutes < dailyTargetMinutes && (qPreSpk.length > 0 || qOffSpk.length > 0)) {
        const t = pickTask(qPreSpk.length > 0 ? qPreSpk : qOffSpk, 35);
        if (t) { dayNodes.push(t); dayMinutes += t.assignedDurationMinutes; }
      }

      if (dayNodes.length === 0) {
        dayNodes.push({
          id: `MOCK_FULL_${currentDay}`,
          stage: "S4", domain: "MOCK_TEST", type: "TEST",
          title: `Tổng duyệt Đề Thi Thử Áp Lực Chuẩn Phòng Thi 3 Tiếng`,
          benefit: "Rèn luyện thể lực và chiến thuật làm bài liên tục 4 kỹ năng.",
          assignedDurationMinutes: 120,
          url: "reading/reading.html"
        });
        dayMinutes = 120;
      }

      calendarDays.push({
        dayNumber: currentDay,
        totalMinutes: dayMinutes,
        phaseId: "PHASE_SPIRAL",
        phaseName: "Lộ Trình Tích Hợp 4 Kỹ Năng",
        phaseDesc: "Phát triển đồng đều 4 kỹ năng kết hợp củng cố ngữ pháp và từ vựng mỗi ngày.",
        nodes: dayNodes
      });
    }

    return {
      totalDays: calendarDays.length,
      estimatedMonths: stats.months || 3,
      dailySchedule: calendarDays
    };
  }
}
