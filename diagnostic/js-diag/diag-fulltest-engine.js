/**
 * diagnostic/js-diag/diag-fulltest-engine.js
 * CỔNG TRUNG GIAN ĐIỀU PHỐI FULL MOCK TEST CAMBRIDGE 21 (GATEWAY / FACADE MASTER)
 * BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ TÍNH NĂNG NÀO
 * - ÁP DỤNG KIẾN TRÚC MODULAR GATEWAY TƯƠNG TỰ IELTS-CORE.JS
 * - LẮP RÁP 5 PHÂN HỆ: GRAMMAR (100 CÂU), LISTENING (4 PARTS), READING (3 PASSAGES), PROD (W/S), SCORING & CLOUD
 * - ĐỘT PHÁ MỚI: TỰ ĐỘNG ĐÓNG GÓI HỒ SƠ ONBOARDING INTAKE & TARGET BAND KHI NỘP BÀI FULL TEST
 * - DUY TRÌ 100% TÍNH TƯƠNG THÍCH TOÀN CỤC: WINDOW.FTENGINE, WINDOW.SWITCHFULLTESTSECTION, WINDOW.SUBMITFULLMOCKTESTEXAM
 * - ĐIỀU PHỐI VÒNG ĐỜI: TIMER, NỘP BÀI CHẤM ĐIỂM ĐA TẦNG, LƯU CLOUD DRIVE & REVIEW MODE
 */

import { ftGrammarSection } from './fulltest-core/ft-grammar-section.js';
import { ftListeningSection } from './fulltest-core/ft-listening-section.js';
import { ftReadingSection } from './fulltest-core/ft-reading-section.js';
import { ftProdSection } from './fulltest-core/ft-prod-section.js';
import { ftScoringCloud } from './fulltest-core/ft-scoring-cloud.js';

class DiagnosticFullTestEngineMaster {
  constructor() {
    this.currentSection = "grammar";
    this.setNum = 1;
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isReviewMode = false;
    this.currentAttemptSnapshot = null;

    // Gắn tham chiếu trực tiếp đến 5 phân hệ chuyên trách
    this.grammarSection = ftGrammarSection;
    this.listeningSection = ftListeningSection;
    this.readingSection = ftReadingSection;
    this.prodSection = ftProdSection;
    this.scoringCloud = ftScoringCloud;
  }

  // =========================================================================
  // 1. KHỞI TẠO VÀ ĐỒNG BỘ 5 PHÂN HỆ KHI MỞ TRANG THI
  // =========================================================================
  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const rawSet = parseInt(urlParams.get('set') || urlParams.get('ver'), 10);
    this.setNum = (!isNaN(rawSet) && rawSet >= 1 && rawSet <= 3) ? rawSet : 1;

    // Cập nhật tiêu đề bài thi
    const titleEl = document.getElementById('fullTestHeaderTitle');
    if (titleEl) {
      titleEl.innerText = `IELTS FULL MOCK TEST • CAMBRIDGE 21 (SET ${this.setNum})`;
    }

    // 1. Nạp 100 câu Ngữ pháp
    await this.grammarSection.load('ftGrammarMount');

    // 2. Nạp 4 phần Listening Cambridge 21
    await this.listeningSection.load(this.setNum, 'ftListeningMount', 'ftAudioPlayer');

    // 3. Nạp 3 bài đọc Reading Cambridge 21
    await this.readingSection.load(this.setNum, 'ftReadingMount');

    // 4. Render phần Writing Task 1 & Task 2
    this.prodSection.renderWriting('ftWritingMount');

    // 5. Render phần Speaking Full 3 Parts
    this.prodSection.renderSpeaking('ftSpeakingMount');

    // 6. Bật đồng hồ đếm giây phòng thi
    this.startTimer();

    // 7. Khôi phục Review Mode nếu có attemptId trên URL (Hỗ trợ Admin / Phụ huynh xem từ xa)
    const attemptId = urlParams.get('attemptId');
    const emailParam = urlParams.get('email') || '';
    if (attemptId) {
      await this.restoreReviewMode(attemptId, emailParam);
    }
  }

  // =========================================================================
  // 2. ĐIỀU KHIỂN ĐỒNG HỒ & CHUYỂN TAB CÁC PHẦN THI
  // =========================================================================
  startTimer() {
    this.timerSeconds = 0;
    const disp = document.getElementById('fullTestTimerDisplay');
    clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.isReviewMode) return;
      this.timerSeconds++;
      if (disp) {
        const mm = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
        const ss = String(this.timerSeconds % 60).padStart(2, '0');
        disp.innerText = `${mm}:${ss}`;
      }
    }, 1000);
  }

  switchSection(key) {
    ['grammar', 'listening', 'reading', 'writing', 'speaking'].forEach(s => {
      const tab = document.getElementById(`tab_ft_${s}`);
      const sec = document.getElementById(`section_ft_${s}`);
      if (tab) tab.classList.toggle('active', s === key);
      if (sec) sec.style.display = (s === key) ? 'block' : 'none';
    });
    this.currentSection = key;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Bộ điều hướng ghi nhận đáp án chung cho các module
  recordAnswer(skill, qId, val) {
    if (skill === 'grammar') this.grammarSection.recordAnswer(qId, val);
    else if (skill === 'listening') this.listeningSection.recordAnswer(qId, val);
    else if (skill === 'reading') this.readingSection.recordAnswer(qId, val);
  }

  // =========================================================================
  // 3. TỔNG HỢP KẾT QUẢ, NỘP BÀI THI & ĐỒNG BỘ GOOGLE DRIVE CLOUD
  // =========================================================================
  async submitFullMockTest() {
    if (!confirm("Em có chắc chắn muốn nộp toàn bộ bài Full Mock Test để xuất Overall Band Score chuẩn và xem lời giải chi tiết từng phần?")) return;

    const btn = document.getElementById('btnSubmitFullMockTest');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `⏳ Đang đối soát đáp án và tính Band Score...`;
    }

    clearInterval(this.timerInterval);
    this.isReviewMode = true;

    // 1. Chấm điểm Ngữ pháp
    const gResult = this.grammarSection.evaluateQuick();
    this.grammarSection.grade(false);

    // 2. Chấm điểm Listening 40 câu
    const lResult = this.listeningSection.evaluate();
    this.listeningSection.renderReviewMode();

    // 3. Chấm điểm Reading 40 câu
    const rResult = this.readingSection.evaluate();
    this.readingSection.renderReviewMode();

    // 4. Chấm điểm Writing Task 1 & Task 2
    const wResult = this.prodSection.evaluateWriting();

    // 5. Chấm điểm Speaking Full 3 Parts
    const sResult = this.prodSection.evaluateSpeaking();

    // 6. Tính Overall Band chính thức theo chuẩn IDP & British Council
    const overallBand = this.scoringCloud.calculateIELTSOverall(
      lResult.band,
      rResult.band,
      wResult.writeBand,
      sResult.spkBand
    );

    // 7. Render Banner kết quả nổi trên đầu trang
    this.scoringCloud.renderInPlaceResultBanner({
      overallBand,
      timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
      lisBand: lResult.band,
      lCorrect: lResult.lCorrect,
      readBand: rResult.band,
      rCorrect: rResult.rCorrect,
      writeBand: wResult.writeBand,
      t1Band: wResult.t1Band,
      t2Band: wResult.t2Band,
      wt1Words: wResult.wt1Words,
      wt2Words: wResult.wt2Words,
      spkBand: sResult.spkBand,
      gScore: gResult.score,
      gTotal: gResult.total
    });

    // 🔴 8. BẮT TRỌN GÓI HỒ SƠ KHẢO SÁT KỲ VỌNG ONBOARDING INTAKE TỪ BỘ NHỚ LOCAL
    let intakeProfile = null;
    try {
      const rawIntake = localStorage.getItem('ielts_student_intake_profile');
      if (rawIntake) {
        intakeProfile = JSON.parse(rawIntake);
      }
    } catch (e) {
      console.warn("[DiagFullTestEngine] Lỗi đọc hồ sơ intake profile:", e);
    }

    if (!intakeProfile) {
      intakeProfile = {
        targetBand: localStorage.getItem('ielts_student_target_band') || "6.5",
        studentRole: "Học sinh Cấp 3",
        schoolType: "Trường Công lập thường",
        schoolEnglishGpa: "6.5 - 7.9",
        priorTesting: "Chưa từng thi",
        purpose: "Xét tuyển Đại học Top đầu",
        deadline: "4 - 6 tháng (Chuẩn)",
        fearedSkill: "Writing (Bí ý tưởng, sợ viết)",
        dailyStudyHours: "1.5 tiếng/ngày",
        completedAt: new Date().toISOString()
      };
    }

    // 9. Đóng gói Snapshot lưu LocalStorage và bắn lên Google Drive
    const studentEmail = localStorage.getItem('ielts_student_email') || 'guest@gmail.com';
    const studentName = localStorage.getItem('ielts_student_name') || 'Học viên';
    const studentId = localStorage.getItem('tram_student_id') || 'TR-FULLTEST';

    const attemptSnapshot = {
      id: "ft_attempt_" + Date.now(),
      timestamp: new Date().toLocaleString('vi-VN'),
      testTitle: `Cambridge 21 Full Mock Test (Set ${this.setNum})`,
      studentName: studentName,
      studentEmail: studentEmail,
      studentId: studentId,
      score: `Band ${overallBand}`,
      timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
      moduleType: "fulltest",
      pageUrl: `diagnostic/runner-fulltest.html?set=${this.setNum}`,
      approvalStatus: "pending_admin_approval",

      // 🎯 KHÓA CHẶT TARGET BAND VÀ TIỀN SỬ HỌC THUẬT VÀO GÓI TIN FULL TEST
      targetBand: intakeProfile.targetBand || "6.5",
      intakeProfile: intakeProfile,

      details: {
        overallBand,
        timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
        lisBand: lResult.band,
        lCorrect: lResult.lCorrect,
        readBand: rResult.band,
        rCorrect: rResult.rCorrect,
        writeBand: wResult.writeBand,
        t1Band: wResult.t1Band,
        t2Band: wResult.t2Band,
        spkBand: sResult.spkBand,
        gScore: gResult.score,
        gTotal: gResult.total,
        
        // BẢO LƯU TRỌN VẸN HỒ SƠ INTAKE TRONG DETAILS
        intakeProfile: intakeProfile,
        targetBand: intakeProfile.targetBand || "6.5",

        grammarAnswers: this.grammarSection.userAnswers || {},
        listeningAnswers: this.listeningSection.userAnswers || {},
        readingAnswers: this.readingSection.userAnswers || {},
        writingAnswers: {
          task1: wResult.t1Text,
          task2: wResult.t2Text
        },
        speakingAnswers: sResult.transcripts || {},
        wAiFeedback: "",
        sAiFeedback: ""
      }
    };

    this.currentAttemptSnapshot = attemptSnapshot;

    // Lưu cục bộ và bắn lên Google Drive Cloud
    this.scoringCloud.saveAttemptLocally(attemptSnapshot);
    this.scoringCloud.syncAttemptToCloud(attemptSnapshot);

    // 10. Gọi AI Gemini chấm Writing & Speaking trực tiếp
    if (wResult.wt1Words > 0 || wResult.wt2Words > 0) {
      this.scoringCloud.renderInlineWritingAICard(wResult.t1Text, wResult.t2Text).then(feedback => {
        if (feedback && this.currentAttemptSnapshot) {
          this.currentAttemptSnapshot.details.wAiFeedback = feedback;
          this.scoringCloud.syncAttemptToCloud(this.currentAttemptSnapshot);
        }
      });
    }

    if (sResult.totalWords > 0) {
      this.scoringCloud.renderInlineSpeakingAICard(sResult.transcripts).then(feedback => {
        if (feedback && this.currentAttemptSnapshot) {
          this.currentAttemptSnapshot.details.sAiFeedback = feedback;
          this.scoringCloud.syncAttemptToCloud(this.currentAttemptSnapshot);
        }
      });
    }

    if (btn) {
      btn.innerHTML = `✓ ĐÃ NỘP BÀI — ĐANG Ở CHẾ ĐỘ XEM LẠI`;
      btn.style.background = "#059669";
    }
  }

  // =========================================================================
  // 4. PHỤC HỒI TOÀN BỘ BÀI THI KHI Ở CHẾ ĐỘ REVIEW MODE
  // =========================================================================
  async restoreReviewMode(attemptId, emailParam = "") {
    this.isReviewMode = true;
    clearInterval(this.timerInterval);

    try {
      const att = await this.scoringCloud.fetchAttemptForReview(attemptId, emailParam);
      if (!att || !att.details) return;
      const d = att.details;

      // Phục hồi Ngữ pháp
      if (d.grammarAnswers) {
        this.grammarSection.restore(d.grammarAnswers);
      }

      // Phục hồi Listening
      if (d.listeningAnswers) {
        this.listeningSection.restore(d.listeningAnswers);
      }

      // Phục hồi Reading
      if (d.readingAnswers) {
        this.readingSection.restore(d.readingAnswers);
      }

      // Phục hồi Writing & Speaking
      this.prodSection.restore(d.writingAnswers, d.speakingAnswers);

      // Phục hồi nhận xét của AI nếu có
      if (d.writingAnswers && (d.writingAnswers.task1 || d.writingAnswers.task2)) {
        this.scoringCloud.renderInlineWritingAICard(d.writingAnswers.task1 || '', d.writingAnswers.task2 || '', d.wAiFeedback);
      }
      if (d.speakingAnswers) {
        this.scoringCloud.renderInlineSpeakingAICard(d.speakingAnswers, d.sAiFeedback);
      }

      // Vẽ lại Banner kết quả nổi
      this.scoringCloud.renderInPlaceResultBanner({
        overallBand: d.overallBand || att.score.replace('Band ', '').trim(),
        timeSpent: att.timeSpent || '180 phút',
        lisBand: d.lisBand || '0.0',
        lCorrect: d.lCorrect || 0,
        readBand: d.readBand || '0.0',
        rCorrect: d.rCorrect || 0,
        writeBand: d.writeBand || '0.0',
        t1Band: d.t1Band || '0.0',
        t2Band: d.t2Band || '0.0',
        spkBand: d.spkBand || '0.0',
        gScore: d.gScore || 0,
        gTotal: d.gTotal || 100
      });

      document.getElementById('btnSubmitFullMockTest')?.remove();
    } catch (e) {
      console.warn("[DiagnosticFullTestEngineMaster] Lỗi khôi phục Review Mode:", e);
    }
  }

  // =========================================================================
  // 5. CÁC HÀM CẦU NỐI (PROXIES) CHO HTML ONCLICK / ONINPUT TRỰC TIẾP
  // =========================================================================
  gradeGrammarSection(useAI) { return this.grammarSection.grade(useAI); }
  resetGrammarSection() { return this.grammarSection.reset(); }
  switchLisPart(idx) { return this.listeningSection.switchPart(idx); }
  switchReadPassage(idx) { return this.readingSection.switchPassage(idx); }
  updateWordCount(a, c, m) { return this.prodSection.updateWordCount(a, c, m); }
  toggleSpeech(t, b, s) { return this.prodSection.toggleSpeech(t, b, s); }
  recordSpeakingText(q, v, s) { return this.prodSection.recordSpeakingText(q, v, s); }

  // Các hàm cầu nối kéo thả Matching Listening
  handleDragStart(e, k, t) { return this.listeningSection.handleDragStart(e, k, t); }
  handleDragOver(e) { return this.listeningSection.handleDragOver(e); }
  handleDragLeave(e) { return this.listeningSection.handleDragLeave(e); }
  handleDrop(e, q) { return this.listeningSection.handleDrop(e, q); }
  selectOptionCard(k, t, el) { return this.listeningSection.selectOptionCard(k, t, el); }
  handleDropzoneClick(q) { return this.listeningSection.handleDropzoneClick(q); }
  clearDropAnswer(q, e) { return this.listeningSection.clearDropAnswer(q, e); }
}

// Khởi tạo Singleton Engine
export const ftEngine = new DiagnosticFullTestEngineMaster();
window.ftEngine = ftEngine;
window.switchFullTestSection = (s) => ftEngine.switchSection(s);
window.submitFullMockTestExam = () => ftEngine.submitFullMockTest();

// Tự động khởi chạy khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => ftEngine.init());
