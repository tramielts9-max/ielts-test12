/**
 * curriculum-system/ui-modules/ui-roadmap-render.js
 * MODULE GIAO DIỆN LỘ TRÌNH 5 CHẶNG & ĐIỀU PHỐI AI GEMINI (ĐÃ GỠ BỎ TOÀN BỘ KHÓA)
 * BẢN FULL ĐẦY ĐỦ 100% - TÍCH HỢP HIỂN THỊ VIDEO LÝ THUYẾT & CHECK HOÀN THÀNH CHUẨN XÁC
 * - Điều phối giọng nói STT & Tải file báo cáo phân tích đầu vào
 * - Băm lộ trình 5 chặng với hạn ngạch 75% đề thật & Vòng lặp ôn tập 3 ngày
 * - Đã gỡ bỏ hoàn toàn cổng chờ duyệt Pending & màn hình tạm khóa học viên
 * - Render 4 thẻ thống kê 3D Duolingo & Danh sách nhiệm vụ học hôm nay
 * - Hiển thị Đốt Video Lý thuyết có Popup xem YouTube trực tiếp
 * - Bộ lọc đối soát lịch sử phân biệt tuyệt đối giữa Full Passage vs Skill Mode
 */

import { curriculumEngineSystem } from '../engine-system.js';
import { MASTER_CURRICULUM_SYSTEM } from '../manifest-system.js';
import { analyzeStudentDiagnostic } from '../ai-service-system.js';
import { stateManager } from '../../js/state.js';
import { theoryVideoEngine } from '../../js/theory-video-engine.js';

let diagRecognition = null;
let isDiagRecording = false;

export class UIRoadmapRenderer {
  constructor(contextUI) {
    this.context = contextUI;
    this.initSpeechSTT();
    this.injectTheoryModalToDOM();
  }

  // =========================================================================
  // 0. NHÚNG POPUP MODAL XEM VIDEO YOUTUBE TRỰC TIẾP TRÊN LỘ TRÌNH
  // =========================================================================
  injectTheoryModalToDOM() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('roadmapTheoryVideoModal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'roadmapTheoryVideoModal';
    modalDiv.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.8); z-index:99999; display:none; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(4px);';

    modalDiv.innerHTML = `
      <div style="background:#FFFFFF; border-radius:24px; border:3px solid #E8E2D8; border-bottom:7px solid #D3CBC0; width:100%; max-width:800px; padding:20px; box-shadow:0 25px 50px rgba(0,0,0,0.3); position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:10px;">
          <div>
            <span id="rmTheoryModalBadge" style="background:#FEF3C7; color:#B45309; border:1px solid #FCD34D; font-size:11px; font-weight:900; padding:2px 8px; border-radius:6px; text-transform:uppercase;">
              BÀI GIẢNG CHIẾN THUẬT
            </span>
            <h3 id="rmTheoryModalTitle" style="margin:6px 0 0 0; font-size:17px; font-weight:900; color:#1E1B4B; line-height:1.35;">
              Đang tải bài giảng...
            </h3>
          </div>
          <button type="button" onclick="window.closeRoadmapTheoryModal()" style="border:none; background:#F1F5F9; border-radius:50%; width:36px; height:36px; font-size:18px; cursor:pointer; font-weight:900; color:#64748B; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>

        <div style="position:relative; width:100%; padding-top:56.25%; background:#000; border-radius:16px; overflow:hidden; margin-bottom:14px;">
          <iframe id="rmTheoryModalIframe" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>

        <p id="rmTheoryModalDesc" style="font-size:13px; color:#475569; background:#FAF7F2; border:1.5px solid #E8E2D8; padding:10px 14px; border-radius:12px; margin:0 0 14px 0; line-height:1.5; font-weight:600;"></p>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <a id="rmTheoryModalStudioLink" href="theory-studio.html" target="_blank" style="font-size:12.5px; font-weight:800; color:#0284C7; text-decoration:none;">
            📂 Mở trong Phòng Bài Giảng Đầy Đủ &rarr;
          </a>
          <button type="button" id="rmTheoryModalBtnDone" onclick="window.confirmRoadmapTheoryCompleted()" style="background:#16A34A; color:white; border:none; padding:10px 20px; border-radius:12px; font-weight:900; font-size:13.5px; cursor:pointer; box-shadow:0 3px 0 #15803D;">
            ✓ Tôi Đã Xem Xong Bài Giảng Này
          </button>
        </div>
      </div>
    `;

    if (document.body) document.body.appendChild(modalDiv);
    else document.addEventListener('DOMContentLoaded', () => document.body?.appendChild(modalDiv));

    window.activeModalVideoId = null;
    window.openRoadmapTheoryModal = (youtubeId, title, desc, videoId, catBadge) => {
      window.activeModalVideoId = videoId;
      const modal = document.getElementById('roadmapTheoryVideoModal');
      const iframe = document.getElementById('rmTheoryModalIframe');
      const titleEl = document.getElementById('rmTheoryModalTitle');
      const descEl = document.getElementById('rmTheoryModalDesc');
      const badgeEl = document.getElementById('rmTheoryModalBadge');
      const linkEl = document.getElementById('rmTheoryModalStudioLink');

      if (titleEl) titleEl.innerText = title || "Bài giảng lý thuyết";
      if (descEl) descEl.innerText = desc || "Hãy ghi chú lại các cấu trúc và bẫy đề thi quan trọng nhé!";
      if (badgeEl) badgeEl.innerText = catBadge || "BÀI GIẢNG CHIẾN THUẬT";
      if (linkEl) linkEl.href = `theory-studio.html?id=${videoId}`;
      if (iframe) iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;

      if (modal) modal.style.display = 'flex';
    };

    window.closeRoadmapTheoryModal = () => {
      const modal = document.getElementById('roadmapTheoryVideoModal');
      const iframe = document.getElementById('rmTheoryModalIframe');
      if (iframe) iframe.src = '';
      if (modal) modal.style.display = 'none';
      window.activeModalVideoId = null;
    };

    window.confirmRoadmapTheoryCompleted = () => {
      if (window.activeModalVideoId && typeof theoryVideoEngine !== 'undefined') {
        theoryVideoEngine.toggleCompleted(window.activeModalVideoId);
      }
      window.closeRoadmapTheoryModal();
      this.context.render();
    };
  }

  // =========================================================================
  // 1. NHẬN DIỆN GIỌNG NÓI WEB SPEECH API (STT TỰ THUẬT TRÌNH ĐỘ)
  // =========================================================================
  initSpeechSTT() {
    if (typeof window === 'undefined') return;
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) return;

    diagRecognition = new window.SpeechRecognition();
    diagRecognition.continuous = true;
    diagRecognition.interimResults = true;
    diagRecognition.lang = 'vi-VN';

    diagRecognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      const area = document.getElementById('diagTextInput');
      if (area) area.value = (final + interim).trim();
    };

    diagRecognition.onerror = (e) => console.warn("STT Lỗi:", e.error);
  }

  toggleMicrophone() {
    if (!diagRecognition) {
      alert("⚠️ Trình duyệt không hỗ trợ nhận diện giọng nói. Em hãy gõ trực tiếp nhé!");
      return;
    }
    const btn = document.getElementById('btnDiagMic');
    const status = document.getElementById('diagMicStatus');

    if (!isDiagRecording) {
      try {
        diagRecognition.start();
        isDiagRecording = true;
        btn?.classList?.add('recording');
        if (btn) btn.innerHTML = `<i class="fa-solid fa-stop"></i> Đang nghe... Bấm để Dừng`;
        if (status) status.innerText = "🔴 Đang lắng nghe giọng nói...";
      } catch (e) {}
    } else {
      try {
        diagRecognition.stop();
        isDiagRecording = false;
        btn?.classList?.remove('recording');
        if (btn) btn.innerHTML = `<i class="fa-solid fa-microphone"></i> Bấm để nói tự thuật trình độ`;
        if (status) status.innerText = "✅ Đã nhận diện xong!";
      } catch (e) {}
    }
  }

  handleFileUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const area = document.getElementById('diagTextInput');
      if (area) area.value = e.target.result;
    };
    reader.readAsText(file);
  }

  // =========================================================================
  // 2. CHẨN ĐOÁN & BĂM LỘ TRÌNH 5 CHẶNG BẰNG AI GEMINI
  // =========================================================================
  async runAIDiagnostic() {
    const text = document.getElementById('diagTextInput')?.value?.trim();
    if (!text) {
      alert("⚠️ Em vui lòng nói vào micro hoặc dán báo cáo trước khi chẩn đoán nhé!");
      return;
    }
    const btn = document.getElementById('btnStartAIAnalyze');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `⏳ AI Gemini đang băm lộ trình 5 chặng & khóa hạn ngạch đề thật...`;
    }

    try {
      const result = await analyzeStudentDiagnostic(text);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `⚡ Chẩn đoán lại`;
      }

      const resBox = document.getElementById('diagAIResultContainer');
      if (!resBox) return;
      resBox.style.display = 'block';

      const startB = parseFloat(result.estimated_band) || 2.0;
      const parsedTarget = parseFloat(result.target_band);
      const targetB = Math.min(7.0, !isNaN(parsedTarget) ? parsedTarget : 7.0);

      const pruned = curriculumEngineSystem.pruneCurriculumByBands(startB, targetB, result);
      const savedCount = MASTER_CURRICULUM_SYSTEM.length - pruned.length;
      const stats = curriculumEngineSystem.calculateSessionsByBands(startB, targetB);

      const targetEmail = this.context.getActiveWorkingEmail();
      const isAdmin = this.context.checkIsAdmin();
      const quota = result.quota_policy || {};

      let badgesHtml = '';
      if (result.schedule_mode === 'SEQUENTIAL_PHASES') {
        badgesHtml += `<span style="background:#dbeafe; color:#1d4ed8; padding:4px 10px; border-radius:8px; font-weight:900; font-size:12px;">📚 LỘ TRÌNH 5 CHẶNG TUẦN TỰ</span> `;
      }
      if (result.vocab_requirement === 'FULL_100_PERCENT') {
        badgesHtml += `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:8px; font-weight:900; font-size:12px;">📖 HỌC SẠCH 100% TỪ VỰNG (28 UNIT)</span> `;
      }
      if (quota.min_official_exam_ratio) {
        badgesHtml += `<span style="background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:8px; font-weight:900; font-size:12px;">🛡️ HẠN NGẠCH ${Math.round(quota.min_official_exam_ratio * 100)}% ĐỀ THI THẬT</span> `;
      }
      if (quota.review_interval_days) {
        badgesHtml += `<span style="background:#f3e8ff; color:#7e22ce; padding:4px 10px; border-radius:8px; font-weight:900; font-size:12px;">🔄 ÔN TẬP DUY TRÌ: ${quota.review_interval_days} NGÀY/ĐỀ CAM</span> `;
      }
      if (quota.prohibited_levels && quota.prohibited_levels.length > 0) {
        badgesHtml += `<span style="background:#fee2e2; color:#b91c1c; padding:4px 10px; border-radius:8px; font-weight:900; font-size:12px;">🚫 ĐÃ CHẶN BÀI VỠ LÒNG: ${quota.prohibited_levels.join(', ')}</span> `;
      }
      if (result.bottleneck_skill) {
        badgesHtml += `<span style="background:#fee2e2; color:#b91c1c; padding:4px 10px; border-radius:8px; font-weight:900; font-size:12px;">🚨 Điểm nghẽn: ${result.bottleneck_skill}</span> `;
      }
      if (result.pruned_domains && result.pruned_domains.length > 0) {
        badgesHtml += `<span style="background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:8px; font-weight:800; font-size:12px;">✂️ Gọt bỏ: ${result.pruned_domains.join(', ')}</span> `;
      }

      let constraintsHtml = '';
      if (result.pedagogical_constraints && result.pedagogical_constraints.length > 0) {
        constraintsHtml = `
          <div style="background:#fffbeb; border:1.5px solid #fde68a; border-radius:10px; padding:10px 14px; margin:10px 0; font-size:13px; color:#92400e;">
            <b>📌 Chỉ thị sư phạm đặc trị từ Gemini:</b>
            <ul style="margin:4px 0 0 16px; padding:0; line-height:1.5;">
              ${result.pedagogical_constraints.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      resBox.innerHTML = `
        <div class="cs-ai-report-card">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <b style="color:#166534; font-size:15px;">🎯 KẾT QUẢ ĐIỀU PHỐI TỪ AI GEMINI</b>
            <span style="background:#e0f2fe; color:#0369a1; padding:3px 10px; border-radius:20px; font-weight:800; font-size:12px;">
              Band ước lượng: ~${startB} ➔ Mục tiêu: ${targetB}
            </span>
          </div>
          
          ${isAdmin ? `
            <div style="background:#e0f2fe; color:#0369a1; padding:6px 12px; border-radius:8px; font-size:13px; font-weight:800; margin-top:8px;">
              👤 Đang thiết lập lộ trình riêng cho học viên: <u>${targetEmail}</u>
            </div>
          ` : ''}

          <p style="font-size:13.5px; color:#1e293b; margin:10px 0; line-height:1.5;">
            <b>Nhận xét:</b> ${result.academic_summary}
          </p>

          ${badgesHtml ? `<div style="margin-bottom:8px; display:flex; flex-wrap:wrap; gap:6px;">${badgesHtml}</div>` : ''}
          ${constraintsHtml}

          <div style="display:flex; gap:12px; font-size:13px; color:#64748b; flex-wrap:wrap; margin-bottom:12px;">
            <span>✂️ Gọt bỏ: <b>${savedCount} bài thừa</b></span>
            <span>🏫 Khóa học: <b>${stats.sessions} buổi</b> (${stats.months} tháng)</span>
            <span>⏱️ BTVN: <b>${stats.days} ngày</b> (${stats.hours}h tự cày)</span>
          </div>

          <button type="button" onclick="window.curriculumUI.applyBandRoadmap(${startB}, ${targetB}, ${JSON.stringify(result).replace(/"/g, '&quot;')})" style="background:#16a34a; color:white; border:none; padding:12px 18px; border-radius:12px; font-weight:900; font-size:14px; cursor:pointer; width:100%; box-shadow:0 3px 0 #15803d;">
            🚀 Phê Duyệt & Kích Hoạt Lộ Trình Này Cho [${targetEmail}]
          </button>
        </div>
      `;
    } catch (e) {
      alert("Lỗi phân tích: " + e.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `⚡ Bắt đầu chẩn đoán bằng AI Gemini`;
      }
    }
  }

  applyBandRoadmap(startBand, targetBand, aiData = null) {
    const targetEmail = this.context.getActiveWorkingEmail();
    const sBand = parseFloat(startBand) || 0.0;
    const tBand = Math.min(7.0, parseFloat(targetBand) || 7.0);

    if (sBand >= tBand) {
      alert("⚠️ Điểm mục tiêu mong muốn (Target Band) phải lớn hơn Điểm hiện tại của em ít nhất 0.5 Band nhé!");
      return;
    }

    const isAdmin = this.context.checkIsAdmin();
    const retainedNodes = curriculumEngineSystem.pruneCurriculumByBands(sBand, tBand, aiData || {});
    const totals = curriculumEngineSystem.calculateTotals(retainedNodes, 'normal', 1.5, sBand, tBand);
    const scheduleData = curriculumEngineSystem.generateDailyCalendar(retainedNodes, 'normal', 1.5, sBand, tBand, aiData || {});

    const payload = {
      createdAt: new Date().toISOString(),
      studentEmail: targetEmail,
      startBand: sBand,
      targetBand: tBand,
      speedProfile: 'normal',
      dailyHours: 1.5,
      currentDay: 1,
      totals,
      schedule: scheduleData.dailySchedule,
      completedNodeIds: [],
      aiDiagnosticData: aiData,
      isLockedByAdmin: false,
      // Luôn mở khóa và phê duyệt ngay cho cả học viên lẫn giáo viên
      approvalStatus: "approved"
    };

    this.context.saveRoadmap(targetEmail, payload);
    this.context.isForceEditing = false;
    this.context.suppressCloudFetchForEmail = '';
    alert(`✅ Đã phê duyệt và kích hoạt lộ trình 5 chặng (${totals.totalLiveSessions} buổi - ${totals.totalDays} ngày) cho học viên: ${targetEmail}!`);
    this.context.render();
  }

  resetRoadmap() {
    const email = this.context.getActiveWorkingEmail();

    if (confirm(`⚠️ Bạn có chắc muốn XÓA LỘ TRÌNH và thiết lập lại từ đầu cho [${email}] không?`)) {
      try {
        localStorage.removeItem(this.context.getStorageKey(email));
      } catch (e) {}
      this.context.syncRoadmapToCloud(email, null);
      this.context.suppressCloudFetchForEmail = email;
      this.context.isForceEditing = true;
      this.context.render();
    }
  }

  // =========================================================================
  // 3. CỔNG DUYỆT ADMIN GATE: BẮC CẦU & CÁC STUB GIỮ TƯƠNG THÍCH API
  // =========================================================================
  findRecentDiagnosticAttempt(email) {
    try {
      const cleanEmail = (email || this.context.getActiveWorkingEmail()).toLowerCase().trim();
      const rawHistory = localStorage.getItem(`ielts_history_${cleanEmail}`) || localStorage.getItem('ielts_local_history');
      if (!rawHistory) return null;
      const history = JSON.parse(rawHistory);
      if (!Array.isArray(history)) return null;

      const diagAttempts = history.filter(item => {
        if (!item) return false;
        const isDiagModule = item.moduleType === 'diagnostic';
        const isDiagTitle = (item.testTitle || '').toLowerCase().includes('khảo sát') || 
                            (item.testTitle || '').toLowerCase().includes('diagnostic') ||
                            (item.testTitle || '').toLowerCase().includes('đầu vào');
        return isDiagModule || isDiagTitle;
      });

      if (diagAttempts.length === 0) return null;
      diagAttempts.sort((a, b) => {
        const epochA = stateManager?.extractEpoch ? stateManager.extractEpoch(a) : 0;
        const epochB = stateManager?.extractEpoch ? stateManager.extractEpoch(b) : 0;
        return epochB - epochA;
      });
      return diagAttempts[0];
    } catch (e) {
      return null;
    }
  }

  async approveStudentRoadmap(studentEmail) {
    const clean = (studentEmail || this.context.getActiveWorkingEmail()).toLowerCase().trim();
    let data = this.context.getSavedRoadmap(clean);

    if (!data) {
      const attempt = this.findRecentDiagnosticAttempt(clean);
      if (attempt) {
        data = curriculumEngineSystem.generateRoadmapFromDiagnostic(attempt);
      }
    }

    if (!data) {
      alert(`⚠️ Không tìm thấy dữ liệu lộ trình của học viên [${clean}] để phê duyệt!`);
      return;
    }

    data.approvalStatus = "approved";
    data.isLockedByAdmin = false;
    data.approvedAt = new Date().toISOString();
    data.approvedBy = this.context.getOriginalAdminEmail();

    this.context.saveRoadmap(clean, data);
    alert(`🎉 ĐÃ PHÊ DUYỆT & MỞ KHÓA THÀNH CÔNG!\nLộ trình của học viên [${clean}] đã sẵn sàng. Học sinh vào lại trang chủ sẽ thấy ngay nhiệm vụ 5 chặng.`);
    this.context.render();
  }

  renderAdminPendingApprovalCard(data, studentEmail) {
    return '';
  }

  renderStudentPendingGate(data, studentEmail) {
    return '';
  }

  // =========================================================================
  // BỘ ĐỐI SOÁT HOÀN THÀNH CHUẨN XÁC: PHÂN BIỆT ĐỐT VIDEO, FULL PASSAGE VÀ SKILL MODE
  // =========================================================================
  resolveNodeCompletionInfo(node, email) {
    // 1. Nếu là Đốt Video Lý Thuyết -> Tra cứu từ kho TheoryVideoEngine
    if (node.isTheoryVideo || node.type === 'THEORY') {
      const vidId = node.videoId || node.id;
      let isDone = false;
      if (typeof theoryVideoEngine !== 'undefined') {
        isDone = theoryVideoEngine.isCompleted(vidId);
      } else if (typeof window !== 'undefined' && window.theoryVideoEngine) {
        isDone = window.theoryVideoEngine.isCompleted(vidId);
      }
      return { isCompleted: isDone, isTheoryVideo: true };
    }

    // 2. Nếu là Bài Sưu Tầm Full Passage hoặc Bài Kỹ Năng -> Phân biệt theo URL
    const nodeUrl = node.url || '';
    if (nodeUrl.includes('data-r/collection/')) {
      const isSkillTask = nodeUrl.includes('skill=');
      const cleanEmail = (email || this.context.getActiveWorkingEmail()).toLowerCase().trim();
      let rawHist = null;
      try { rawHist = localStorage.getItem(`ielts_history_${cleanEmail}`) || localStorage.getItem('ielts_local_history'); } catch (e) {}

      if (rawHist) {
        try {
          const hist = JSON.parse(rawHist);
          if (Array.isArray(hist)) {
            const matchCode = nodeUrl.match(/st-(\d+)/);
            const targetCode = matchCode ? matchCode[0] : '';

            if (targetCode) {
              const matchedAttempt = hist.find(item => {
                if (!item || item.moduleType !== 'reading') return false;
                const pUrl = item.pageUrl || item.url || '';
                if (!pUrl.includes(targetCode)) return false;

                if (isSkillTask) {
                  const matchSkill = nodeUrl.match(/skill=([^&]+)/);
                  const skillTag = matchSkill ? matchSkill[1] : '';
                  return skillTag ? pUrl.includes(`skill=${skillTag}`) : pUrl.includes('skill=');
                } else {
                  // Bài Full: BẮT BUỘC KHÔNG CHỨA skill=
                  return !pUrl.includes('skill=');
                }
              });

              if (matchedAttempt) {
                return {
                  isCompleted: true,
                  firstAttempt: matchedAttempt,
                  latestAttempt: matchedAttempt
                };
              }
            }
          }
        } catch (e) {}
      }
    }

    // 3. Fallback mặc định về bộ quản lý CalendarHistory
    if (this.context.calendarHistoryMgr?.getNodeCompletionInfo) {
      return this.context.calendarHistoryMgr.getNodeCompletionInfo(node);
    }

    return { isCompleted: false };
  }

  // =========================================================================
  // 4. RENDER GIAO DIỆN CHÍNH: FORM THIẾT LẬP HOẶC BẢN ĐỒ LỘ TRÌNH 5 CHẶNG
  // =========================================================================
  async renderRoadmap(targetContainerId = 'roadmapSectionMount') {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    const email = this.context.getActiveWorkingEmail();
    const isAdmin = this.context.checkIsAdmin();

    let data = this.context.getSavedRoadmap(email);

    if (!data && email !== 'guest' && this.context.suppressCloudFetchForEmail !== email) {
      data = await this.context.fetchStudentRoadmapFromCloud(email);
    }

    // Tự động bắc cầu bài thi Diagnostic gần nhất nếu học sinh chưa có roadmap
    if (!data && email !== 'guest') {
      const recentDiag = this.findRecentDiagnosticAttempt(email);
      if (recentDiag) {
        data = curriculumEngineSystem.generateRoadmapFromDiagnostic(recentDiag);
        this.context.saveRoadmap(email, data);
      }
    }

    // Tải lịch học và gói học phí
    if (email && email !== 'guest') {
      this.context.scheduleTuitionMgr.fetchSchedules(email).then(() => {
        if (this.context.calendarHistoryMgr.cachedAttempts.length > 0) {
          this.context.calendarHistoryMgr.renderTodayHistoryAndCalendar(this.context.calendarHistoryMgr.cachedAttempts, email);
        }
      });
    }

    const adminBarHtml = this.context.adminGateMgr.renderAdminControlBar();
    const floatingBarHtml = this.context.adminGateMgr.renderFloatingImpersonationBar();

    const adminPendingCardHtml = '';

    // 4. Nếu chưa có dữ liệu hoặc Admin chủ động bấm "Soạn Lại"
    if (!data || this.context.isForceEditing) {
      container.innerHTML = `
        <div class="cs-container">
          ${adminBarHtml}
          ${floatingBarHtml}
          <div style="text-align:center; padding:10px;">
            <h3 style="margin:0 0 6px 0; font-size:22px; font-weight:900; color:#8B1518;">
              🎯 THIẾT LẬP LỘ TRÌNH CHO: <span style="color:#0284c7;">${email}</span>
            </h3>
            <p style="margin:0 auto 16px auto; max-width:650px; font-size:14px; color:#64748b; font-weight:700;">
              Lộ trình tính xuôi theo số buổi học (300k/buổi - 12 buổi/tháng) hoặc phân tích tự động bằng AI Gemini:
            </p>

            <div style="background:#FAF7F2; border:2px solid #E8E2D8; border-radius:18px; padding:20px; max-width:620px; margin:0 auto 20px auto; display:flex; flex-direction:column; gap:14px;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; text-align:left;">
                <div>
                  <label style="font-size:13px; font-weight:800; color:#1e293b; display:block; margin-bottom:5px;">📍 1. Điểm hiện tại:</label>
                  <select id="matrixStartBandSelect" class="border border-slate-300 rounded p-2 text-sm w-full font-bold">
                    <option value="0.0">0.0 (Mất gốc hoàn toàn)</option>
                    <option value="2.0">2.0 (Biết bập bõm, mất gốc)</option>
                    <option value="3.0">3.0 (Nhớ từ vựng căn bản)</option>
                    <option value="3.5">3.5 (Ngữ pháp câu đơn)</option>
                    <option value="4.0">4.0 (Đã học tiếng Anh cơ bản)</option>
                    <option value="4.5">4.5 (Có gốc, chưa làm đề)</option>
                    <option value="5.0" selected>5.0 (Bắt đầu làm quen đề)</option>
                    <option value="5.5">5.5 (Đã thi thử 5.0 - 5.5)</option>
                    <option value="6.0">6.0 (Cần lên 6.5 - 7.0)</option>
                    <option value="6.5">6.5 (Nước rút chạm trần 7.0)</option>
                  </select>
                </div>

                <div>
                  <label style="font-size:13px; font-weight:800; color:#1e293b; display:block; margin-bottom:5px;">🎯 2. Mục tiêu mong muốn:</label>
                  <select id="matrixTargetBandSelect" class="border border-slate-300 rounded p-2 text-sm w-full font-bold">
                    <option value="5.0">Band 5.0 (Tốt nghiệp cơ bản / Định cư)</option>
                    <option value="5.5">Band 5.5 (Chuẩn đầu ra Cao đẳng / ĐH)</option>
                    <option value="6.0" selected>Band 6.0 (Xét tuyển Đại học Top đầu)</option>
                    <option value="6.5">Band 6.5 (Chuẩn vàng Du học & Việc làm)</option>
                    <option value="7.0">Band 7.0 (TRẦN CAO NHẤT KHÓA HỌC)</option>
                  </select>
                </div>
              </div>

              <div style="font-size:13px; color:#64748b; text-align:left; font-weight:700;">
                🏫 Lớp học: <b>3 buổi/tuần (2h/buổi = 12 buổi/tháng)</b> • BTVN: <b>1.5h tự cày/ngày</b>.
              </div>

              <button type="button" onclick="window.curriculumUI.applyBandRoadmap(document.getElementById('matrixStartBandSelect').value, document.getElementById('matrixTargetBandSelect').value)" style="background:#8B1518; color:white; border:none; padding:12px; border-radius:14px; font-weight:900; font-size:14.5px; cursor:pointer;">
                🚀 BẮT ĐẦU TẠO LỘ TRÌNH RIÊNG
              </button>
            </div>

            <div class="cs-diag-box">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <b style="color:#0369a1; font-size:14px;"><i class="fa-solid fa-wand-magic-sparkles"></i> CHẨN ĐOÁN & BĂM 5 CHẶNG TUẦN TỰ BẰNG AI GEMINI</b>
                  <div style="font-size:12.5px; color:#64748b; margin-top:2px; font-weight:700;">Dán báo cáo điểm chi tiết hoặc nói tự thuật, AI sẽ băm đúng 5 Chặng tuần tự:</div>
                </div>
                <button type="button" id="btnDiagMic" class="cs-diag-mic-btn" onclick="window.curriculumUI.toggleMicrophone()">
                  <i class="fa-solid fa-microphone"></i> Bấm để nói tự thuật trình độ
                </button>
              </div>

              <textarea id="diagTextInput" class="cs-diag-textarea" placeholder="Dán toàn bộ bản phân tích điểm hoặc gõ tự thuật..."></textarea>

              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="file" id="diagFileInput" accept=".txt" style="display:none;" onchange="window.curriculumUI.handleFileUpload(this.files[0])">
                  <button type="button" onclick="document.getElementById('diagFileInput').click()" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:7px 14px; border-radius:8px; font-size:12.5px; font-weight:bold; cursor:pointer;">
                    📄 Tải file báo cáo (.txt)
                  </button>
                  <span id="diagMicStatus" style="font-size:12.5px; color:#16a34a; font-weight:bold;"></span>
                </div>

                <button type="button" id="btnStartAIAnalyze" onclick="window.curriculumUI.runAIDiagnostic()" style="background:#0284c7; color:white; border:none; padding:10px 20px; border-radius:10px; font-weight:800; font-size:13.5px; cursor:pointer;">
                  ⚡ Gửi AI Phân Tích & Băm Lộ Trình 5 Chặng
                </button>
              </div>

              <div id="diagAIResultContainer" style="display:none;"></div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // 5. Cập nhật tiến độ hoàn thành từ lịch sử thực tế (sử dụng bộ đối soát chuẩn xác)
    if (!Array.isArray(data.completedNodeIds)) data.completedNodeIds = [];
    (data.schedule || []).forEach(day => {
      (day.nodes || []).forEach(node => {
        const comp = this.resolveNodeCompletionInfo(node, email);
        if (comp.isCompleted && !data.completedNodeIds.includes(node.id)) {
          data.completedNodeIds.push(node.id);
        }
      });
    });

    const completedTotal = data.completedNodeIds.length;
    const progressPercent = data.totals?.nodeCount > 0 ? Math.min(100, Math.round((completedTotal / data.totals.nodeCount) * 100)) : 0;
    const currentDayPlan = data.schedule.find(s => s.dayNumber === data.currentDay) || data.schedule[0] || { nodes: [] };
    const totalDaysCount = data.schedule.length;

    container.innerHTML = `
      <div class="cs-container">
        ${adminBarHtml}
        ${floatingBarHtml}
        ${adminPendingCardHtml}

        <!-- BANNER ĐỒNG BỘ SỐ NGÀY ĐỘNG (${totalDaysCount} NGÀY) -->
        <div style="background: linear-gradient(135deg, #8B1518 0%, #B91C1C 100%); border-radius: 18px; padding: 20px 24px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 0 #5E0C0E; color: white;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #FFC800; color: #5A3800; font-size: 12px; font-weight: 900; padding: 3px 10px; border-radius: 20px;">CHẶNG: BAND ${data.startBand || 0.0} ➔ ${data.targetBand || 7.0}</span>
              ${isAdmin ? `
                <span style="background: #FEF08A; color: #854D0E; font-size: 12px; font-weight: 900; padding: 3px 10px; border-radius: 20px;">👑 QUYỀN ADMIN: TOÀN QUYỀN ĐIỀU CHỈNH</span>
              ` : ''}
              <span style="font-size: 13.5px; opacity: 0.95; font-weight: 700;">(1.5h BTVN/ngày)</span>
            </div>
            <h3 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 900; color: #FFFFFF;">
              🗺️ LỘ TRÌNH 5 CHẶNG TUẦN TỰ: ${email} (${totalDaysCount} NGÀY)
            </h3>
            <p style="margin: 5px 0 0 0; font-size: 13.5px; opacity: 0.95; font-weight: 700;">
              Lộ trình được thiết lập tuần tự: Ngữ pháp ➔ Reading + 100% Từ vựng ➔ Listening ➔ Writing ➔ Bùng nổ Speaking.
            </p>
          </div>
          
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <a href="curriculum-system/roadmap.html?studentEmail=${encodeURIComponent(email)}" class="btn-3d" style="background: #FFFFFF; color: #8B1518 !important; border-bottom: 4px solid rgba(0,0,0,0.18); font-size: 14.5px; padding: 12px 22px;">
              🚀 XEM TOÀN BỘ LỘ TRÌNH &rarr;
            </a>

            ${isAdmin ? `
              <button type="button" onclick="window.curriculumUI.triggerEditRoadmap()" class="btn-3d" style="background: #3B82F6; color: #FFFFFF !important; border-bottom: 4px solid #1D4ED8; padding: 12px 16px; font-size: 13.5px;" title="Soạn lại hoặc điều chỉnh bằng AI">
                ✏️ Soạn lại
              </button>
            ` : ''}

            <button type="button" onclick="window.curriculumUI.resetRoadmap()" class="btn-3d" style="background: rgba(255,255,255,0.2); color: #FFFFFF !important; border: 1.5px solid rgba(255,255,255,0.4); border-bottom: 4px solid rgba(0,0,0,0.2); padding: 12px 16px; font-size: 13.5px;" title="Xóa và thiết lập lại từ đầu">
              🔄 Đặt lại
            </button>
          </div>
        </div>

        <div class="cs-header">
          <div class="cs-title-group">
            <h3>
              <i class="fa-solid fa-calendar-day"></i> NHIỆM VỤ HỌC HÔM NAY (NGÀY ${data.currentDay}/${totalDaysCount})
            </h3>
          </div>
        </div>

        <!-- 4 Ô THỐNG KÊ DUOLINGO 3D -->
        <div class="cs-stats-grid">
          <div class="cs-stat-box stat-box-red">
            <div class="cs-stat-val" style="color: #8B1518;">🎯 ${completedTotal}/${data.totals.nodeCount}</div>
            <div class="cs-stat-lbl" style="color: #630D10;">Đốt đã hoàn thành</div>
          </div>
          <div class="cs-stat-box stat-box-green">
            <div class="cs-stat-val" style="color: #15803D;">⚡ ${data.totals.totalSelfStudyHours}h</div>
            <div class="cs-stat-lbl" style="color: #14532D;">BTVN Tự cày (${totalDaysCount} ngày)</div>
          </div>
          <div class="cs-stat-box stat-box-blue">
            <div class="cs-stat-val" style="color: #0284C7;">🏫 ${data.totals.totalLiveSessions} buổi</div>
            <div class="cs-stat-lbl" style="color: #0369A1;">Học GV (${data.totals.totalTeacherHours}h - HP: ${data.totals.tuitionVND})</div>
          </div>
          <div class="cs-stat-box stat-box-gold">
            <div class="cs-stat-val" style="color: #D97706;">⏳ ${data.totals.estimatedMonths} tháng</div>
            <div class="cs-stat-lbl" style="color: #92400E;">${data.totals.totalWeeks} tuần (${totalDaysCount} ngày BTVN)</div>
          </div>
        </div>

        <div class="cs-progress-container">
          <div class="cs-progress-header">
            <span>Tiến độ hoàn thành</span>
            <span><b>${progressPercent}%</b> (${completedTotal}/${data.totals.nodeCount} bài)</span>
          </div>
          <div class="cs-progress-bar-bg">
            <div class="cs-progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        <!-- DANH SÁCH BÀI TẬP HÔM NAY -->
        <div class="cs-task-list">
          ${(currentDayPlan.nodes || []).map(node => {
            const compInfo = this.resolveNodeCompletionInfo(node, email);
            const isDone = compInfo.isCompleted;
            const isRemedial = !!node.isRemedial || (node.title || '').includes('ĐẶC TRỊ');
            const isTheoryVideo = !!node.isTheoryVideo || node.type === 'THEORY';

            // TRƯỜNG HỢP 1: THẺ ĐỐT VIDEO LÝ THUYẾT CHIẾN THUẬT
            if (isTheoryVideo) {
              const ytId = node.youtubeId || (node.url && node.url.includes('id=') ? node.url.split('id=')[1] : '');
              return `
                <div class="cs-task-card ${isDone ? 'is-done' : ''}" style="border: 2.5px solid #FCD34D !important; border-bottom: 5px solid #F59E0B !important; background: #FFFDF7 !important;">
                  <div class="cs-task-info">
                    <div class="cs-task-meta">
                      <span class="cs-node-id" style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D;">${node.id}</span>
                      <span class="cs-node-domain" style="background: #FEE2E2; color: #991B1B;">🎬 LÝ THUYẾT CHIẾN THUẬT</span>
                      <span class="cs-node-time">⏱️ Thời lượng: <b>${node.assignedDurationMinutes || 15} phút</b></span>
                    </div>
                    <div class="cs-task-title" style="color: #1E1B4B; font-size: 15px;">
                      ${isDone ? '✓ ' : ''}${node.title}
                    </div>
                    <div style="font-size: 13px; color: #92400E; background: #FEF9C3; border: 1.5px solid #FDE047; padding: 6px 12px; border-radius: 10px; margin-top: 6px; line-height: 1.45; font-weight: 700;">
                      💡 <b>Chiến lược:</b> ${node.benefit || 'Xem kỹ video trước khi bước vào giải 5 bài tập thực chiến bên dưới!'}
                    </div>
                  </div>

                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    ${isDone ? `
                      <span class="cs-btn-action cs-btn-done" style="padding: 5px 12px; font-size: 12px; border-radius: 8px; background: #16A34A; color: white;">
                        <i class="fa-solid fa-circle-check"></i> Đã học bài giảng
                      </span>
                    ` : ''}

                    <button type="button" onclick="window.openRoadmapTheoryModal('${ytId}', '${(node.title || '').replace(/'/g, "\\'")}', '${(node.benefit || '').replace(/'/g, "\\'")}', '${node.videoId || node.id}', '${node.domain || 'LÝ THUYẾT'}')" 
                            class="cs-btn-action" style="background: #D97706; color: white; border: none; border-bottom: 4px solid #B45309; padding: 8px 18px; border-radius: 12px; font-weight: 900; font-size: 13.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(217,119,6,0.25);">
                      🎬 Xem Bài Giảng Ngay &rarr;
                    </button>
                  </div>
                </div>
              `;
            }

            // TRƯỜNG HỢP 2: THẺ BÀI TẬP THỰC HÀNH / BÀI ĐỌC SƯU TẦM / BÀI KỸ NĂNG
            return `
              <div class="cs-task-card ${isDone ? 'is-done' : ''}" style="${isRemedial ? 'border-left: 6px solid #EF4444 !important;' : ''}">
                <div class="cs-task-info">
                  <div class="cs-task-meta">
                    <span class="cs-node-id">${node.id}</span>
                    <span class="cs-node-domain">${node.domain}</span>
                    ${isRemedial ? `<span style="font-size:11px; font-weight:900; background:#FEE2E2; color:#B91C1C; padding:2px 8px; border-radius:8px;">🚨 BÀI CỨU CÂU SAI</span>` : ''}
                    <span class="cs-node-time">⏱️ Dự kiến: <b>${node.assignedDurationMinutes} phút</b></span>
                  </div>
                  <div class="cs-task-title">
                    ${isDone ? '✓ ' : ''}${node.title}
                  </div>
                  
                  ${isDone ? `
                    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
                      <div style="font-size: 13px; font-weight: 800; color: #166534; background: #DCFCE7; border: 1.5px solid #86EFAC; border-radius: 8px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="background: #166534; color: white; padding: 1px 6px; border-radius: 5px; font-size: 11px;">LẦN 1</span>
                        <span>🎯 Điểm: <b>${compInfo.firstAttempt?.score || 'Đạt'}</b></span>
                        <span>⏱️ Thời gian: <b>${compInfo.firstAttempt?.timeSpent || 'Chuẩn'}</b></span>
                        <span>📅 Nộp lúc: <b>${compInfo.firstAttempt?.timestamp || 'Đã ghi nhận'}</b></span>
                      </div>

                      ${compInfo.latestAttempt && compInfo.latestAttempt !== compInfo.firstAttempt ? `
                        <div style="font-size: 13px; font-weight: 800; color: #065F46; background: #A7F3D0; border: 1.5px solid #34D399; border-radius: 8px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span style="background: #059669; color: white; padding: 1px 6px; border-radius: 5px; font-size: 11px;">LẦN 2 (MỚI NHẤT)</span>
                          <span>🎯 Điểm: <b>${compInfo.latestAttempt.score}</b></span>
                          <span>⏱️ Thời gian: <b>${compInfo.latestAttempt.timeSpent}</b></span>
                          <span>📅 Nộp lúc: <b>${compInfo.latestAttempt.timestamp}</b></span>
                        </div>
                      ` : ''}
                    </div>
                  ` : `
                    <div style="font-size: 13px; color: #756D68; background: #FAF7F2; border: 1.5px solid #E8E2D8; padding: 6px 12px; border-radius: 10px; margin-top: 6px; line-height: 1.4; font-weight: 700;">
                      💡 <b>Lợi ích:</b> ${node.benefit || 'Củng cố phản xạ ngôn ngữ và kỹ năng học thuật.'}
                    </div>
                  `}
                </div>

                <div>
                  ${isDone ? `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                      <span class="cs-btn-action cs-btn-done" style="padding: 5px 12px; font-size: 12px; border-radius: 8px;">
                        <i class="fa-solid fa-circle-check"></i> Đã hoàn thành
                      </span>
                      <a href="${node.url}" target="_blank" class="cs-btn-action" style="background: #FFFFFF; color: #166534; border: 2px solid #86EFAC; border-bottom: 4px solid #4ADE80; padding: 7px 16px; font-size: 13px; text-decoration: none; border-radius: 10px; font-weight: 900; white-space: nowrap;">
                        🔄 Làm lại bài &rarr;
                      </a>
                    </div>
                  ` : `
                    <a href="${node.url}" target="_blank" class="cs-btn-action cs-btn-start">
                      🚀 Vào làm bài &rarr;
                    </a>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
