/**
 * diagnostic/js-diag/diag-engine.js
 * CỔNG ĐIỀU PHỐI KHẢO THÍ CHẨN ĐOÁN THÍCH ỨNG MASTER (GATEWAY / FACADE)
 * (BẢN FULL ĐẦY ĐỦ 100% - BẢO TOÀN NGUYÊN VẸN MỌI TÍNH NĂNG NGOẠI VI)
 * - TẬP TRUNG KẾT NỐI 4 MODULE VỆ TINH: SNAPSHOT-SYNC, DRAFT-STORAGE, BAND-CALIBRATOR, RESULT-BANNER
 * - NẠP ĐỘNG 5 KỸ NĂNG: NGỮ PHÁP, LISTENING, READING, WRITING, SPEAKING
 * - BẢO LƯU 100% WEBSPEECH THU ÂM TRỰC TIẾP & REVIEW MODE TỪ CLOUD / LOCAL
 * - ĐỘT PHÁ MỚI: TỰ ĐỘNG ĐÓNG GÓI HỒ SƠ KHẢO SÁT KỲ VỌNG & TARGET BAND VÀO GÓI TIN NỘP BÀI
 * - ĐẢM BẢO CÁC FILE HTML GỌI VÀO KHÔNG BỊ GÃY BẤT KỲ HÀM WINDOW.* NÀO
 */

import { diagGrammarEngine } from './diag-grammar.js';
import { diagListeningEngine } from './diag-listening.js';
import { diagReadingEngine } from './diag-reading.js';
import { diagWritingEngine } from './diag-writing.js';
import { diagSpeakingEngine } from './diag-speaking.js';
import { diagAIService, TEST_CEILINGS, roundIELTS, calculateSmartOverCap } from './diag-ai.js';

// NẠP 4 MODULE VỆ TINH ĐÃ ĐƯỢC CHUYÊN MÔN HÓA
import { DiagSnapshotSync, DIAGNOSTIC_META, CLOUD_SCRIPT_URL } from './engine-diag/diag-snapshot-sync.js';
import { DiagDraftStorage } from './engine-diag/diag-draft-storage.js';
import { diagBandCalibrator } from './engine-diag/diag-band-calibrator.js';
import { diagResultBanner } from './engine-diag/diag-result-banner.js';

class DiagnosticEngineMaster {
  constructor() {
    this.currentSkill = "grammar";
    this.testId = "test_01";
    this.setNum = 1;

    // Giữ nguyên tính năng WebSpeech trực tiếp gốc
    this.speechRecognition = null;
    this.isRecording = false;

    this.isReviewMode = false;
    this.currentAttemptSnapshot = null;

    // KHỞI TẠO CÁC MODULE VỆ TINH CHUYÊN TRÁCH
    this.snapshotSync = new DiagSnapshotSync(this);
    this.draftStorage = new DiagDraftStorage(this);
    this.calibrator = diagBandCalibrator;
    this.banner = diagResultBanner;
  }

  // Thuộc tính getter/setter đồng bộ số giây với module SnapshotSync
  get timerSeconds() {
    return this.snapshotSync ? this.snapshotSync.timerSeconds : 0;
  }
  set timerSeconds(val) {
    if (this.snapshotSync) this.snapshotSync.timerSeconds = val;
  }

  get isSnapshotTaken() {
    return this.snapshotSync ? this.snapshotSync.isSnapshotTaken : false;
  }
  set isSnapshotTaken(val) {
    if (this.snapshotSync) this.snapshotSync.isSnapshotTaken = val;
  }

  get snapshotOfficialData() {
    return this.snapshotSync ? this.snapshotSync.snapshotOfficialData : null;
  }
  set snapshotOfficialData(val) {
    if (this.snapshotSync) this.snapshotSync.snapshotOfficialData = val;
  }

  // =========================================================================
  // 1. KHỞI TẠO HỆ THỐNG KHẢO THÍ & NẠP DỮ LIỆU ĐỀ THI
  // =========================================================================
  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.testId = urlParams.get('testId') || 'test_01';
    
    const rawSet = parseInt(urlParams.get('set') || urlParams.get('ver'), 10);
    this.setNum = (!isNaN(rawSet) && rawSet >= 1 && rawSet <= 3) ? rawSet : 1;

    const meta = DIAGNOSTIC_META[this.testId] || DIAGNOSTIC_META.test_01;
    const titleEl = document.getElementById('currentTestTitle');
    if (titleEl) {
      titleEl.innerText = `${meta.title} • Set ${this.setNum}`;
    }

    // 1. Nạp Ngữ pháp
    await this.initGrammarFromJson();

    // 2. Nạp Listening
    await this.initListeningFromJson();

    // 3. Nạp Reading
    await this.initReadingFromJson();

    // 4. Nạp Writing
    await this.initWritingFromJson();

    // 5. Nạp Speaking động từ JSON
    await this.initSpeakingFromJson();

    // 6. Khởi tạo Speech Recognition gốc (bảo toàn 100%)
    this.initSpeechRecognition();

    // 7. Khôi phục nháp bài làm cũ qua module DraftStorage (CHỐNG F5 / CÚP ĐIỆN)
    this.draftStorage.restoreLocalDraft();

    // 8. Bật đồng hồ đếm giây & kích hoạt Heartbeat tự lưu Cloud mỗi 2 phút
    this.snapshotSync.startTimer();

    // 9. Bật tiến trình theo dõi Auto-Save khi học sinh tương tác
    this.draftStorage.initAutoSaveListeners();

    // 10. Bật bộ xử lý hàng đợi Retry chống rớt mạng
    this.snapshotSync.initCloudRetryProcessor();

    // 11. Khôi phục Review Mode nếu có attemptId trên URL (Hỗ trợ mở từ Cloud cho Admin)
    const attemptId = urlParams.get('attemptId');
    const emailParam = urlParams.get('email') || '';
    if (attemptId) {
      await this.restoreReviewMode(attemptId, emailParam);
    }
  }

  // --- NẠP CÁC KỸ NĂNG TỪ FILE JSON RIÊNG BIỆT ---
  async initGrammarFromJson() {
    const testNum = this.testId.replace('test_0', '').replace('test_', '');
    const jsonPath = `data-diag/grammar/test${testNum}-grammar.json`;
    console.log(`[DiagEngine] Đang nạp Grammar JSON: ${jsonPath}`);
    const success = await diagGrammarEngine.loadTestFromJson(jsonPath);
    if (success) {
      diagGrammarEngine.render();
    }
  }

  async initListeningFromJson() {
    const testNum = this.testId.replace('test_0', '').replace('test_', '');
    const jsonPath = `data-diag/listening/test${testNum}-listening-s${this.setNum}.json`;
    console.log(`[DiagEngine] Đang nạp Listening JSON: ${jsonPath}`);
    const success = await diagListeningEngine.loadTestFromJson(jsonPath);
    if (success) {
      diagListeningEngine.render();
    }
  }

  async initReadingFromJson() {
    const testNum = this.testId.replace('test_0', '').replace('test_', '');
    const jsonPath = `data-diag/reading/test${testNum}-reading-s${this.setNum}.json`;
    console.log(`[DiagEngine] Đang nạp Reading JSON: ${jsonPath}`);
    const success = await diagReadingEngine.loadTestFromJson(jsonPath);
    if (success) {
      diagReadingEngine.render();
    }
  }

  async initWritingFromJson() {
    const testNum = this.testId.replace('test_0', '').replace('test_', '');
    const jsonPath = `data-diag/writing/test${testNum}-writing-s${this.setNum}.json`;
    console.log(`[DiagEngine] Đang nạp Writing JSON: ${jsonPath}`);
    const success = await diagWritingEngine.loadTestFromJson(jsonPath);
    if (success) {
      diagWritingEngine.render();
    }
  }

  async initSpeakingFromJson() {
    const testNum = this.testId.replace('test_0', '').replace('test_', '');
    const jsonPath = `data-diag/speaking/test${testNum}-speaking.json`;
    console.log(`[DiagEngine] Đang nạp Speaking JSON: ${jsonPath}`);
    diagSpeakingEngine.init(false, this.testId);
    await diagSpeakingEngine.loadTestFromJson(jsonPath);
    diagSpeakingEngine.render('speakingQuestionsMount');
  }

  // --- CHUYỂN TAB SECTION ---
  switchSection(skillKey) {
    ['grammar', 'listening', 'reading', 'writing', 'speaking'].forEach(s => {
      const tab = document.getElementById(`tabNav_${s}`);
      const sec = document.getElementById(`section_${s}`);
      if (tab) tab.classList.toggle('active', s === skillKey);
      if (sec) sec.style.display = (s === skillKey) ? 'block' : 'none';
    });
    this.currentSkill = skillKey;
    this.saveLocalDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // 2. CÁC HÀM CẦU NỐI VỚI MODULE LƯU TRỮ VÀ ĐỒNG BỘ
  // =========================================================================
  saveLocalDraft() {
    if (this.draftStorage) this.draftStorage.saveLocalDraft();
  }

  getSkillAnswers(skill) {
    if (skill === 'grammar') return diagGrammarEngine.userAnswers || {};
    if (skill === 'listening') return diagListeningEngine.userAnswers || {};
    if (skill === 'reading') return diagReadingEngine.userAnswers || {};
    return {};
  }

  getWritingSnapshotData() {
    return (diagWritingEngine && typeof diagWritingEngine.getWritingSnapshot === 'function')
      ? diagWritingEngine.getWritingSnapshot()
      : {};
  }

  getSpeakingSnapshotData() {
    return (diagSpeakingEngine && typeof diagSpeakingEngine.getSpeakingSnapshot === 'function')
      ? diagSpeakingEngine.getSpeakingSnapshot()
      : {};
  }

  collectCurrentExamData() {
    return this.draftStorage ? this.draftStorage.collectCurrentExamData() : {};
  }

  countWords(str) {
    return this.calibrator.countWords(str);
  }

  // =========================================================================
  // 3. GIỮ NGUYÊN VẸN 100% TÍNH NĂNG THU ÂM GỐC CỦA DIAG-ENGINE
  // =========================================================================
  initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) return;
    this.speechRecognition = new window.SpeechRecognition();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';
  }

  toggleSpeech(targetAreaId, btnId) {
    if (!this.speechRecognition) {
      alert("⚠️ Trình duyệt chưa hỗ trợ Web Speech. Em hãy gõ trực tiếp câu trả lời vào ô nhé!");
      return;
    }
    const btn = document.getElementById(btnId);
    const area = document.getElementById(targetAreaId);

    if (!this.isRecording) {
      try {
        this.speechRecognition.start();
        this.isRecording = true;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-stop"></i> Đang nghe... Bấm dừng`;
        this.speechRecognition.onresult = (e) => {
          let str = '';
          for (let i = 0; i < e.results.length; ++i) str += e.results[i][0].transcript + ' ';
          if (area) {
            area.value = str.trim();
            this.saveLocalDraft();
          }
        };
      } catch (e) {}
    } else {
      try {
        this.speechRecognition.stop();
        this.isRecording = false;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-microphone"></i> Bấm để nói tiếng Anh`;
      } catch (e) {}
    }
  }

  // =========================================================================
  // 4. CHẤM BÀI TRỰC TIẾP TRÊN GIAO DIỆN & LƯU ĐẦY ĐỦ 2 BẢNG KẾT QUẢ + HỒ SƠ INTAKE
  // =========================================================================
  async submitFullExam() {
    if (!confirm("Em có chắc chắn muốn nộp bài thi để hệ thống phân tích câu chữ và xuất 2 bảng điểm (Chuẩn giờ & Toàn diện) không?")) {
      return;
    }

    const btnSubmit = document.getElementById('btnSubmitFullDiagnostic');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `⏳ AI đang chấm bài và xuất bảng điểm 2 mốc thời gian...`;
    }

    this.snapshotSync.stopTimer();
    this.isReviewMode = true;

    // 1. Chấm bài thực tế hiện tại
    const liveGrammar = diagGrammarEngine.evaluate();
    const liveLis = diagListeningEngine.evaluate();
    const liveRead = diagReadingEngine.evaluate();
    const liveWritingSub = diagWritingEngine.getWritingSubmissionData ? diagWritingEngine.getWritingSubmissionData() : {};
    const liveSpeakingSub = diagSpeakingEngine.getSpeakingSubmissionData ? diagSpeakingEngine.getSpeakingSubmissionData() : {};

    // 2. Chấm bài mốc chuẩn giờ (Official Timed Snapshot)
    const meta = DIAGNOSTIC_META[this.testId] || DIAGNOSTIC_META.test_01;
    const isOvertime = this.timerSeconds > (meta.snapshotSeconds || 3000);
    const snapshotData = (isOvertime && this.snapshotOfficialData) ? this.snapshotOfficialData : {
      grammarAnswers: liveGrammar.answersSnapshot || {},
      listeningAnswers: liveLis.answersSnapshot || {},
      readingAnswers: liveRead.answersSnapshot || {},
      writingSnapshot: liveWritingSub,
      speakingSnapshot: liveSpeakingSub
    };

    // 3. TÍNH ĐIỂM WRITING & SPEAKING CHO BẢNG CHUẨN GIỜ QUA CALIBRATOR
    const snapT1Words = snapshotData.writingSnapshot?.task1Words || this.countWords(snapshotData.writingSnapshot?.task1Text || '');
    const snapT2Words = snapshotData.writingSnapshot?.task2Words || this.countWords(snapshotData.writingSnapshot?.task2Text || '');
    const snapWritingEst = this.calibrator.estimateWritingBand(snapT1Words, snapT2Words, this.testId);
    const snapWBand = snapWritingEst.finalBand;

    const snapSpkWords = this.countWords((snapshotData.speakingSnapshot?.transcriptsList || []).join(' '));
    const snapSBand = this.calibrator.estimateSpeakingBand(snapSpkWords, this.testId);

    // 4. TÍNH ĐIỂM WRITING & SPEAKING CHO BÀI NỘP THỰC TẾ
    const liveWritingEst = this.calibrator.estimateWritingBand(liveWritingSub.task1Words, liveWritingSub.task2Words, this.testId);
    const liveWBand = liveWritingEst.finalBand;

    const liveSpkWords = this.countWords((liveSpeakingSub.transcriptsList || []).join(' '));
    const liveSBand = this.calibrator.estimateSpeakingBand(liveSpkWords, this.testId);

    // 5. QUY ĐỔI % VÀ ĐỊNH VỊ BAND CHUẨN XÁC THEO MA TRẬN TỪNG TEST
    const liveOverallScore = this.calibrator.calculateOverallScore(liveGrammar, liveLis, liveRead, liveWBand);
    const liveBandInfo = this.calibrator.calculateCalibratedBand(this.testId, liveOverallScore, liveWBand, liveSBand);
    
    const snapBandInfo = isOvertime 
      ? this.calibrator.calculateCalibratedBand(this.testId, Math.max(0, liveOverallScore - 10), snapWBand, snapSBand)
      : liveBandInfo;

    // 6. KÍCH HOẠT REVIEW MODE CHO CÁC MODULE TRÊN GIAO DIỆN
    diagGrammarEngine.renderReviewMode(liveGrammar);
    diagListeningEngine.renderReviewMode(liveLis);
    diagReadingEngine.renderReviewMode(liveRead);
    if (diagWritingEngine.renderReviewMode) {
      diagWritingEngine.renderReviewMode(liveWritingSub.answersSnapshot || {});
    }
    if (diagSpeakingEngine.renderReviewMode) {
      diagSpeakingEngine.renderReviewMode(liveSpeakingSub.answersSnapshot || {});
    }

    // 7. TRÍCH XUẤT BLUEPRINT LỖ HỔNG (ITEM-LEVEL ERROR PROFILE)
    const blueprintProfile = this.calibrator.extractBlueprintProfile(
      this.testId, liveGrammar, liveRead, liveLis, liveWritingSub, liveSpkWords
    );

    // 8. RENDER THANH BANNER NỔI XUẤT ĐỦ 2 KẾT QUẢ ĐỘC LẬP
    this.banner.renderInPlaceDualResultBanner({
      isOvertime,
      timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
      snapshotTimeLabel: `${meta.snapshotMinutes} phút`,
      officialResult: {
        band: snapBandInfo.estimatedBand,
        score: `${isOvertime ? Math.max(0, liveOverallScore - 10) : liveOverallScore}/100`,
        reason: snapBandInfo.bandReason,
        wBand: snapWBand.toFixed(1),
        sBand: snapSBand.toFixed(1)
      },
      potentialResult: {
        band: liveBandInfo.estimatedBand,
        score: `${liveOverallScore}/100`,
        reason: liveBandInfo.bandReason,
        gScore: `${liveGrammar.score}/${liveGrammar.total}`,
        lScore: `${liveLis.score}/${liveLis.total}`,
        rScore: `${liveRead.score}/${liveRead.total}`,
        wBand: liveWBand.toFixed(1),
        sBand: liveSBand.toFixed(1)
      }
    });

    // 🔴 9. BẮT TRỌN GÓI HỒ SƠ KHẢO SÁT KỲ VỌNG ONBOARDING INTAKE TỪ BỘ NHỚ LOCAL
    let intakeProfile = null;
    try {
      const rawIntake = localStorage.getItem('ielts_student_intake_profile');
      if (rawIntake) {
        intakeProfile = JSON.parse(rawIntake);
      }
    } catch (e) {
      console.warn("[DiagEngine] Lỗi đọc hồ sơ intake profile:", e);
    }

    // Nếu không có, tạo hồ sơ mặc định phòng thủ an toàn
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

    // 10. ĐÓNG GÓI SNAPSHOT LƯU VÀO LOCAL STORAGE & CLOUD DRIVE
    const studentEmail = localStorage.getItem('ielts_student_email') || 'guest@gmail.com';
    const studentName = localStorage.getItem('ielts_student_name') || 'Học viên';
    const studentId = localStorage.getItem('tram_student_id') || 'TR-GUEST';

    const attemptSnapshot = {
      id: "diag_attempt_" + Date.now(),
      timestamp: new Date().toLocaleString('vi-VN'),
      testTitle: `${meta.title} (Set ${this.setNum})`,
      studentName: studentName,
      studentEmail: studentEmail,
      studentId: studentId,
      score: `Band ${snapBandInfo.estimatedBand} (${liveOverallScore}/100)`,
      timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
      moduleType: "diagnostic",
      pageUrl: `diagnostic/runner-diag.html?testId=${this.testId}&set=${this.setNum}`,
      approvalStatus: "pending_admin_approval",
      statusTag: "final_submitted",

      // 🎯 KHÓA CHẶT TARGET BAND VÀ TIỀN SỬ HỌC THUẬT VÀO GÓI TIN BÀI LÀM
      targetBand: intakeProfile.targetBand || "6.5",
      intakeProfile: intakeProfile,

      details: {
        isOvertime,
        officialBand: snapBandInfo.estimatedBand,
        potentialBand: liveBandInfo.estimatedBand,
        overallScore: `${liveOverallScore}/100`,
        timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
        bandReason: liveBandInfo.bandReason,
        gScore: `${liveGrammar.score}/${liveGrammar.total}`,
        lScore: `${liveLis.score}/${liveLis.total}`,
        rScore: `${liveRead.score}/${liveRead.total}`,
        wBand: liveWBand.toFixed(1),
        sBand: liveSBand.toFixed(1),
        blueprintProfile: blueprintProfile,
        
        // BẢO LƯU TRỌN VẸN HỒ SƠ INTAKE TRONG DETAILS ĐỂ ROADMAP ĐỌC TRỰC TIẾP
        intakeProfile: intakeProfile,
        targetBand: intakeProfile.targetBand || "6.5",

        grammarSnapshot: liveGrammar.answersSnapshot || {},
        gWrongList: liveGrammar.wrongList || [],
        listeningSnapshot: liveLis.answersSnapshot || {},
        lDetails: liveLis.details || [],
        readingSnapshot: liveRead.answersSnapshot || {},
        rDetails: liveRead.details || [],
        writingAnswersSnapshot: liveWritingSub.answersSnapshot || {},
        wt1Text: liveWritingSub.task1Text || '',
        wt2Text: liveWritingSub.task2Text || '',
        spk1Text: document.getElementById('diag_spk_1')?.value || '',
        spk2Text: document.getElementById('diag_spk_2')?.value || '',
        speakingAnswersSnapshot: liveSpeakingSub.answersSnapshot || {},
        wAiFeedback: "",
        sAiFeedback: ""
      }
    };

    this.currentAttemptSnapshot = attemptSnapshot;

    // Lưu vào Local Storage
    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      localHist.unshift(attemptSnapshot);
      localStorage.setItem('ielts_local_history', JSON.stringify(localHist));

      // Mở khóa bài tiếp theo nếu đạt yêu cầu
      if (this.testId === 'test_01' && liveOverallScore >= 40) localStorage.setItem('diag_unlocked_test2', 'true');
      if (this.testId === 'test_02' && liveOverallScore >= 55) localStorage.setItem('diag_unlocked_test3', 'true');
    } catch (e) {}

    // DỌN DẸP BẢN NHÁP TẠM TRÊN MÁY HỌC SINH SAU KHI NỘP THÀNH CÔNG
    this.draftStorage.clearLocalDraft();

    // BẮN GÓI TIN HOÀN THÀNH (ĐÃ CÓ ĐẦY ĐỦ INTAKE PROFILE) LÊN GOOGLE DRIVE
    this.snapshotSync.syncAttemptToCloud(attemptSnapshot, "final_submitted");

    // 11. GỌI AI CHẤM TRỰC TIẾP WRITING & SPEAKING
    diagWritingEngine.evaluateAndRenderInlineAI().then(wRes => {
      if (wRes && this.currentAttemptSnapshot) {
        this.currentAttemptSnapshot.details.wAiFeedback = JSON.stringify(wRes);
        this.snapshotSync.syncAttemptToCloud(this.currentAttemptSnapshot, "ai_feedback_updated");
      }
    });

    diagSpeakingEngine.evaluateAndRenderInlineAI().then(sRes => {
      if (sRes && this.currentAttemptSnapshot) {
        this.currentAttemptSnapshot.details.sAiFeedback = JSON.stringify(sRes);
        this.snapshotSync.syncAttemptToCloud(this.currentAttemptSnapshot, "ai_feedback_updated");
      }
    });

    if (btnSubmit) {
      btnSubmit.innerHTML = `✓ ĐÃ NỘP BÀI — ĐANG Ở CHẾ ĐỘ XEM LẠI`;
      btnSubmit.style.background = "#059669";
    }
  }

  // =========================================================================
  // 5. REVIEW MODE TỪ LỊCH SỬ & GOOGLE DRIVE CLOUD SERVER
  // =========================================================================
  async restoreReviewMode(attemptId, emailParam = "") {
    this.isReviewMode = true;
    try {
      let att = null;
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      att = localHist.find(a => a.id === attemptId);

      if ((!att || !att.details) && (emailParam || CLOUD_SCRIPT_URL)) {
        const queryEmail = emailParam || localStorage.getItem('ielts_student_email') || '';
        if (queryEmail) {
          try {
            const res = await fetch(CLOUD_SCRIPT_URL, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ action: "get_single_attempt", email: queryEmail, attemptId: attemptId })
            });
            const cloudData = await res.json();
            if (cloudData && cloudData.attempt) att = cloudData.attempt;
          } catch (cloudErr) {
            console.warn("[DiagEngine] Không thể tải bài làm từ Google Drive:", cloudErr);
          }
        }
      }

      if (!att || !att.details) return;
      const d = att.details;

      // Khôi phục Ngữ pháp
      if (d.grammarSnapshot) {
        diagGrammarEngine.renderReviewMode({
          answersSnapshot: d.grammarSnapshot,
          details: d.gWrongList ? d.gWrongList.map(w => ({
            questionId: `t${this.testId.replace('test_0','')}_g${String(w.num).padStart(2,'0')}`,
            userAnswer: w.chosen,
            expectedAnswer: w.expected,
            isCorrect: false,
            explanation: w.explanation
          })) : []
        });
      }

      // Khôi phục Listening
      diagListeningEngine.renderReviewMode({
        answersSnapshot: d.listeningSnapshot || {},
        details: d.lDetails || []
      });

      // Khôi phục Reading
      if (d.rDetails) {
        diagReadingEngine.renderReviewMode({
          answersSnapshot: d.readingSnapshot || {},
          details: d.rDetails
        });
      }

      // Khôi phục Writing
      if (d.writingAnswersSnapshot && diagWritingEngine.renderReviewMode) {
        diagWritingEngine.renderReviewMode(d.writingAnswersSnapshot);
      }

      // Khôi phục Speaking cũ
      const spk1 = document.getElementById('diag_spk_1');
      const spk2 = document.getElementById('diag_spk_2');
      if (spk1 && d.spk1Text) { spk1.value = d.spk1Text; spk1.disabled = true; }
      if (spk2 && d.spk2Text) { spk2.value = d.spk2Text; spk2.disabled = true; }

      // Khôi phục Speaking mới
      if (d.speakingAnswersSnapshot && diagSpeakingEngine.renderReviewMode) {
        diagSpeakingEngine.renderReviewMode({ answersSnapshot: d.speakingAnswersSnapshot });
      }

      // Vẽ lại Banner kết quả 2 mốc
      const meta = DIAGNOSTIC_META[this.testId] || DIAGNOSTIC_META.test_01;
      this.banner.renderInPlaceDualResultBanner({
        isOvertime: !!d.isOvertime,
        timeSpent: att.timeSpent || 'N/A',
        snapshotTimeLabel: `${meta.snapshotMinutes} phút`,
        officialResult: {
          band: d.officialBand || att.score.split('(')[0].replace('Band', '').trim(),
          score: d.overallScore || 'N/A',
          reason: d.bandReason || '',
          wBand: d.wBand || '0.0',
          sBand: d.sBand || '0.0'
        },
        potentialResult: {
          band: d.potentialBand || d.officialBand || '0.0',
          score: d.overallScore || 'N/A',
          reason: d.bandReason || '',
          gScore: d.gScore || 'N/A',
          lScore: d.lScore || 'N/A',
          rScore: d.rScore || 'N/A',
          wBand: d.wBand || '0.0',
          sBand: d.sBand || '0.0'
        }
      });

      document.getElementById('btnSubmitFullDiagnostic')?.remove();
    } catch (e) {
      console.warn("[DiagEngine] Lỗi khôi phục Review Mode:", e);
    }
  }

  // =========================================================================
  // 6. CÔNG CỤ CONSOLE DÀNH CHO ADMIN ĐỂ KIỂM THỬ THỜI GIAN NHANH
  // =========================================================================
  warpTimer(targetSeconds) {
    this.snapshotSync.warpTimer(targetSeconds);
  }

  warpTimerToSnapshot() {
    this.snapshotSync.warpTimerToSnapshot();
  }
}

// KHỞI TẠO SINGLETON VÀ GẮN CÁC BIẾN TOÀN CỤC CHỐNG LỖI HTML
export const diagEngine = new DiagnosticEngineMaster();
window.diagEngine = diagEngine;
window.switchSkillSection = (s) => diagEngine.switchSection(s);
window.toggleDiagSpeech = (t, b) => diagEngine.toggleSpeech(t, b);
window.submitDiagnosticExam = () => diagEngine.submitFullExam();

// CÔNG CỤ CONSOLE CHO ADMIN KIỂM THỬ NHANH
window.warpTimerToSnapshot = () => diagEngine.warpTimerToSnapshot();
window.warpTimer = (sec) => diagEngine.warpTimer(sec);

document.addEventListener('DOMContentLoaded', () => diagEngine.init());
