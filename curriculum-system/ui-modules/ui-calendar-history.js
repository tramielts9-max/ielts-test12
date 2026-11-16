/**
 * curriculum-system/ui-modules/ui-calendar-history.js
 * MODULE LỊCH CHUYÊN CẦN DUOLINGO, TÍNH CHUỖI STREAK & BANNER LỊCH SỬ NỘP BÀI
 * BẢN FULL ĐẦY ĐỦ 100% - BẢO TOÀN NGUYÊN VẸN MỌI THUẬT TOÁN & TÍNH NĂNG
 * - Vẽ lịch tháng đổi màu theo mật độ làm bài (Zero, Low, Mid, Full, Over 🔥)
 * - Tích hợp buổi học trực tiếp (🔴 Lớp 1-1 & 👥 Lớp nhóm) lên từng ô lịch
 * - Thuật toán tính Streak ngọn lửa chính xác có bảo lưu ngày hôm qua
 * - Bóc tách lịch sử nộp bài độc lập từng học sinh & Điều hướng Review link
 * - Đối soát chính xác tiến độ Video Lý Thuyết & phân biệt tuyệt đối Reading 101-320 Full vs Skill Mode
 */

import { CONFIG } from '../../js/config.js';
import { stateManager } from '../../js/state.js';

export class UICalendarHistoryManager {
  constructor(contextUI) {
    this.context = contextUI;
    this.calCurrentMonth = new Date().getMonth();
    this.calCurrentYear = new Date().getFullYear();
    this.cachedAttempts = [];
    this.cachedEmail = '';
    this.selectedDateStr = this.getFormattedDate(new Date());
    this.isListCollapsed = false;
  }

  // =========================================================================
  // 1. TIỆN ÍCH NGÀY THÁNG & ĐỊNH DẠNG CHUẨN DD/MM/YYYY
  // =========================================================================
  getFormattedDate(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
      d = new Date();
    }
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  }

  calculateStreak(uniqueDatesSet) {
    if (!uniqueDatesSet || typeof uniqueDatesSet.has !== 'function') return 0;
    let streak = 0;
    const checkDate = new Date();

    while (true) {
      const str = this.getFormattedDate(checkDate);
      if (uniqueDatesSet.has(str)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Cơ chế nhân nhượng: Nếu hôm nay chưa làm bài, kiểm tra xem hôm qua có làm không
        if (streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = this.getFormattedDate(checkDate);
          if (uniqueDatesSet.has(yesterdayStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    return streak;
  }

  // =========================================================================
  // 2. CÔ LẬP TIẾN ĐỘ BÀI LÀM: ĐỐI SOÁT LỊCH SỬ TỪNG HỌC VIÊN
  // =========================================================================
  getNodeCompletionInfo(node, specifiedEmail = null) {
    try {
      // 0. Nếu là Đốt Video Lý Thuyết -> Tra cứu trạng thái đã xem từ TheoryVideoEngine / LocalStorage
      if (node && (node.isTheoryVideo || node.type === 'THEORY')) {
        const vidId = node.videoId || node.id;
        let isTheoryDone = false;
        if (typeof window !== 'undefined' && window.theoryVideoEngine?.isCompleted) {
          isTheoryDone = window.theoryVideoEngine.isCompleted(vidId);
        } else {
          try {
            const arr = JSON.parse(localStorage.getItem('tram_theory_completed_vids') || '[]');
            isTheoryDone = Array.isArray(arr) && arr.includes(vidId);
          } catch (e) {}
        }
        if (isTheoryDone) {
          return {
            isCompleted: true,
            totalAttempts: 1,
            firstAttempt: {
              score: 'Đã xem',
              timeSpent: 'Lý thuyết',
              timestamp: 'Hoàn thành'
            },
            latestAttempt: null
          };
        }
        return { isCompleted: false, totalAttempts: 0 };
      }

      const activeEmail = (specifiedEmail || this.context?.getActiveWorkingEmail?.() || 'guest').toLowerCase().trim();
      const adminEmail = (localStorage.getItem('ielts_admin_backup_email') || 'tramielts9@gmail.com').toLowerCase().trim();
      
      let history = [];
      const isViewingStudent = this.context?.isImpersonating?.() || 
                               (this.context?.checkIsAdmin?.() && this.context?.targetStudentEmail && this.context.targetStudentEmail !== adminEmail) ||
                               (specifiedEmail && specifiedEmail !== adminEmail);

      if (isViewingStudent) {
        const studentRaw = localStorage.getItem(`ielts_history_${activeEmail}`);
        history = studentRaw ? JSON.parse(studentRaw) : [];
      } else {
        history = stateManager?.getLocalHistory?.() || [];
        if ((!Array.isArray(history) || history.length === 0) && activeEmail !== 'guest') {
          const fallbackRaw = localStorage.getItem(`ielts_history_${activeEmail}`);
          history = fallbackRaw ? JSON.parse(fallbackRaw) : [];
        }
      }

      if (!Array.isArray(history)) history = [];

      // Đối soát tách biệt tuyệt đối cho kho Reading Sưu tầm 101-320 (Full vs ?skill=...)
      const nodeUrl = String(node?.url || '').toLowerCase();
      const isCollectionNode = nodeUrl.includes('data-r/collection/');
      let matches = [];

      if (isCollectionNode) {
        const isSkillTask = nodeUrl.includes('skill=');
        const matchCode = nodeUrl.match(/st-(\d+)/i);
        const targetCode = matchCode ? matchCode[0].toLowerCase() : '';
        const matchSkill = nodeUrl.match(/skill=([^&]+)/i);
        const targetSkill = matchSkill ? matchSkill[1].toLowerCase() : '';

        if (targetCode) {
          matches = history.filter(item => {
            if (!item) return false;
            const pUrl = String(item.pageUrl || item.url || '').toLowerCase();
            const isReadRec = item.moduleType === 'reading' || pUrl.includes('runner-reading');
            if (!isReadRec || !pUrl.includes(targetCode)) return false;

            if (isSkillTask) {
              return targetSkill ? pUrl.includes(`skill=${targetSkill}`) : pUrl.includes('skill=');
            }
            return !pUrl.includes('skill=');
          });
        }
      } else {
        matches = history.filter(item => {
          if (!item) return false;
          const t = (item.testTitle || '').toLowerCase();
          const nTitle = (node?.title || '').toLowerCase();
          const nId = (node?.id || '').toLowerCase();
          const u = (item.pageUrl || '').toLowerCase();
          const nu = (node?.url || '').toLowerCase();

          const matchId = nId && t.includes(nId);
          const matchTitle = (nTitle && t.includes(nTitle)) || (t && nTitle.includes(t));
          const matchUrl = nu && u && (u.includes(nu) || nu.includes(u));
          const codeInNode = node?.url?.match(/[\d]+[\-\.][\d]+/)?.[0];
          const matchCode = codeInNode && t.includes(codeInNode);

          return matchId || matchTitle || matchUrl || matchCode;
        });
      }

      if (matches.length > 0) {
        matches.sort((a, b) => {
          const epochA = stateManager?.extractEpoch ? stateManager.extractEpoch(a) : 0;
          const epochB = stateManager?.extractEpoch ? stateManager.extractEpoch(b) : 0;
          return epochA - epochB;
        });

        const first = matches[0];
        const latest = matches.length > 1 ? matches[matches.length - 1] : null;

        return {
          isCompleted: true,
          totalAttempts: matches.length,
          firstAttempt: {
            score: first.score || 'Đã nộp',
            timeSpent: first.timeSpent && first.timeSpent !== 'N/A' ? first.timeSpent : 'Hoàn thành',
            timestamp: first.timestamp || ''
          },
          latestAttempt: latest ? {
            score: latest.score || 'Đã nộp',
            timeSpent: latest.timeSpent && latest.timeSpent !== 'N/A' ? latest.timeSpent : 'Hoàn thành',
            timestamp: latest.timestamp || ''
          } : null
        };
      }
    } catch (e) {
      console.warn("Lỗi đọc lịch sử đốt bài tập:", e);
    }
    return { isCompleted: false, totalAttempts: 0 };
  }

  isNodeCompletedInHistory(node) {
    return this.getNodeCompletionInfo(node).isCompleted;
  }

  getModuleTheme(moduleType, url = '', title = '') {
    const detected = moduleType || stateManager?.detectModuleType?.(url, title);
    return CONFIG?.MODULES?.[detected]?.theme || {
      bg: "#F8FAFC",
      border: "#E2E8F0",
      tagBg: "#64748B",
      text: "#1E293B",
      label: "Luyện Tập"
    };
  }

  resolveReviewPageUrl(pageUrl, id, email) {
    if (!pageUrl) return `reading/runner-reading.html?attemptId=${id}&email=${encodeURIComponent(email)}`;
    let target = pageUrl;
    if (target.startsWith('runner-reading.html')) target = 'reading/' + target;
    if (target.startsWith('runner-listening.html')) target = 'listening/' + target;
    const sep = target.includes('?') ? '&' : '?';
    return `${target}${sep}attemptId=${id}&email=${encodeURIComponent(email)}`;
  }

  // =========================================================================
  // 3. ĐIỀU KHIỂN GIAO DIỆN LỊCH
  // =========================================================================
  selectCalendarDate(day, month, year) {
    this.selectedDateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    this.renderTodayHistoryAndCalendar(this.cachedAttempts, this.cachedEmail);
  }

  toggleListCollapse() {
    this.isListCollapsed = !this.isListCollapsed;
    const body = document.getElementById('csSelectedDateListBody');
    if (body) body.style.display = this.isListCollapsed ? 'none' : 'block';
  }

  changeCalMonth(delta) {
    this.calCurrentMonth += delta;
    if (this.calCurrentMonth > 11) {
      this.calCurrentMonth = 0;
      this.calCurrentYear += 1;
    } else if (this.calCurrentMonth < 0) {
      this.calCurrentMonth = 11;
      this.calCurrentYear -= 1;
    }
    this.renderTodayHistoryAndCalendar(this.cachedAttempts, this.cachedEmail);
  }

  // =========================================================================
  // 4. VẼ LƯỚI LỊCH THÁNG (PASTEL DUOLINGO & HUY HIỆU BUỔI HỌC)
  // =========================================================================
  generateMonthCalendarHtml(attempts) {
    const year = this.calCurrentYear;
    const month = this.calCurrentMonth;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Đếm số lượng bài BTVN đã nộp trong từng ngày của tháng
    const dateCountMap = {};
    (attempts || []).forEach(att => {
      const m = att?.timestamp?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m && parseInt(m[2], 10) === (month + 1) && parseInt(m[3], 10) === year) {
        const d = parseInt(m[1], 10);
        dateCountMap[d] = (dateCountMap[d] || 0) + 1;
      }
    });

    // Bản đồ buổi học trực tiếp trong tháng (Hỗ trợ cả lớp 1-1 và lớp học nhóm)
    const scheduleDateMap = {};
    const cleanEmail = (this.cachedEmail || '').toLowerCase().trim();
    const schedulesList = this.context?.scheduleTuitionMgr?.cachedSchedules || [];

    schedulesList.forEach(ev => {
      if (!ev || !ev.date) return;
      const isSingle = (ev.studentEmail || '').toLowerCase().trim() === cleanEmail;
      const isGrp = Array.isArray(ev.studentEmails) && ev.studentEmails.map(e => (e || '').toLowerCase().trim()).includes(cleanEmail);
      if (!isSingle && !isGrp) return;

      const sParts = ev.date.split('-');
      if (sParts.length === 3 && parseInt(sParts[0], 10) === year && parseInt(sParts[1], 10) === (month + 1)) {
        const d = parseInt(sParts[2], 10);
        if (!scheduleDateMap[d]) scheduleDateMap[d] = [];
        scheduleDateMap[d].push(ev);
      }
    });

    const now = new Date();
    const isCurrentMonthNow = now.getFullYear() === year && now.getMonth() === month;
    const todayDateNum = now.getDate();

    let gridHtml = '';
    for (let i = 0; i < adjustedFirstDay; i++) {
      gridHtml += `<div class="cs-cal-cell cs-cal-cell-empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const count = dateCountMap[day] || 0;
      const schedulesOnDay = scheduleDateMap[day] || [];
      const hasSchedule = schedulesOnDay.length > 0;
      const isFuture = isCurrentMonthNow && (day > todayDateNum);

      const dStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      const isSelected = this.selectedDateStr === dStr;

      let colorClass = 'cal-color-zero';
      if (isFuture) {
        colorClass = 'cal-color-future';
      } else if (count === 0) {
        colorClass = 'cal-color-zero';
      } else if (count === 1) {
        colorClass = 'cal-color-low';
      } else if (count === 2) {
        colorClass = 'cal-color-mid';
      } else if (count >= 3 && count <= 4) {
        colorClass = 'cal-color-full';
      } else if (count >= 5) {
        colorClass = 'cal-color-over';
      }

      const activeBorder = isSelected ? 'box-shadow: 0 0 0 3.5px #8B1518, 0 4px 12px rgba(0,0,0,0.25); transform: scale(1.08); z-index: 5;' : '';

      // Huy hiệu thể hiện buổi học trực tiếp trên ô lịch
      let scheduleBadgeHtml = '';
      if (hasSchedule) {
        const firstEv = schedulesOnDay[0];
        const isGrp = firstEv.isGroup || (Array.isArray(firstEv.studentEmails) && firstEv.studentEmails.length > 1);
        const isReq = schedulesOnDay.some(s => s.status === 'reschedule_requested');
        const badgeColor = isReq ? '#EF4444' : (isGrp ? '#9333EA' : '#D97706');
        scheduleBadgeHtml = `
          <span style="background:${badgeColor}; color:white; font-size:10px; font-weight:900; padding:1px 4px; border-radius:4px; margin-top:2px; display:inline-block; max-width:95%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${isGrp ? '👥' : '🔴'} ${firstEv.startTime || ''}
          </span>
        `;
      }

      gridHtml += `
        <div class="cs-cal-cell ${colorClass}" style="${activeBorder}" onclick="window.curriculumUI.selectCalendarDate(${day}, ${month}, ${year})">
          <span>${day}</span>
          ${scheduleBadgeHtml}
          ${count > 0 ? `<span class="cs-cal-subtext">${count >= 5 ? '🔥 ' : ''}${count} bài</span>` : ''}
        </div>
      `;
    }

    return `
      <div class="cs-calendar-wrapper">
        <div class="cs-calendar-nav">
          <b class="cs-calendar-title">
            <i class="fa-solid fa-fire text-amber-500"></i> LỊCH CHUYÊN CẦN: THÁNG ${month + 1}/${year}
          </b>
          <div style="display:flex; gap:8px;">
            <button type="button" class="cs-cal-btn" onclick="window.curriculumUI.changeCalMonth(-1)">◀ Tháng trước</button>
            <button type="button" class="cs-cal-btn" onclick="window.curriculumUI.changeCalMonth(1)">Tháng sau ▶</button>
          </div>
        </div>

        <div class="cs-calendar-grid">
          <div class="cs-cal-day-name">T2</div>
          <div class="cs-cal-day-name">T3</div>
          <div class="cs-cal-day-name">T4</div>
          <div class="cs-cal-day-name">T5</div>
          <div class="cs-cal-day-name">T6</div>
          <div class="cs-cal-day-name">T7</div>
          <div class="cs-cal-day-name">CN</div>
          ${gridHtml}
        </div>

        <div class="cs-legend-bar">
          <span style="color: #756D68; font-size: 13.5px; margin-right: 6px;">Ký hiệu:</span>
          <div class="cs-legend-item"><span style="width:10px; height:10px; background:#D97706; border-radius:50%; display:inline-block;"></span> <span>🔴 Lớp 1-1</span></div>
          <div class="cs-legend-item"><span style="width:10px; height:10px; background:#9333EA; border-radius:50%; display:inline-block;"></span> <span>👥 Lớp nhóm</span></div>
          <div class="cs-legend-item"><span class="cs-legend-dot cal-color-low"></span> <span>1 bài BTVN</span></div>
          <div class="cs-legend-item"><span class="cs-legend-dot cal-color-full"></span> <span>3-4 bài</span></div>
          <div class="cs-legend-item"><span class="cs-legend-dot cal-color-over"></span> <span>5+ bài 🔥</span></div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 5. RENDER DANH SÁCH LỊCH SỬ NỘP BÀI & BUỔI HỌC THEO NGÀY ĐƯỢC CHỌN
  // =========================================================================
  renderTodayHistoryAndCalendar(attempts = [], email = '') {
    if (stateManager?.sortAttemptsDescending) {
      this.cachedAttempts = stateManager.sortAttemptsDescending(attempts);
    } else {
      this.cachedAttempts = (attempts || []).slice().reverse();
    }
    this.cachedEmail = email;

    const container = document.getElementById('historyResultsList');
    if (!container) return;

    const cleanEmail = (email || '').toLowerCase().trim();
    const selectedAttempts = this.cachedAttempts.filter(att => (att?.timestamp || '').includes(this.selectedDateStr));

    // Lọc các buổi học trùng ngày được chọn
    const parts = this.selectedDateStr.split('/');
    const selectedIsoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
    const schedulesList = this.context?.scheduleTuitionMgr?.cachedSchedules || [];
    
    const selectedSchedules = schedulesList.filter(ev => {
      if (!ev || ev.date !== selectedIsoDate) return false;
      const isSingle = (ev.studentEmail || '').toLowerCase().trim() === cleanEmail;
      const isGrp = Array.isArray(ev.studentEmails) && ev.studentEmails.map(e => (e || '').toLowerCase().trim()).includes(cleanEmail);
      return isSingle || isGrp;
    });

    const todayStr = this.getFormattedDate(new Date());
    const todayAttemptsCount = this.cachedAttempts.filter(att => (att?.timestamp || '').includes(todayStr)).length;
    const badge = document.getElementById('totalAttemptsBadge');
    if (badge) badge.innerText = `${todayAttemptsCount} bài hôm nay`;

    const uniqueDates = new Set();
    this.cachedAttempts.forEach(att => {
      const m = att?.timestamp?.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (m) uniqueDates.add(m[1]);
    });
    const streakCount = this.calculateStreak(uniqueDates);
    const streakBadge = document.getElementById('streakCounterBadge');
    if (streakBadge) {
      streakBadge.innerHTML = `<i class="fa-solid fa-fire"></i> ${streakCount} NGÀY`;
    }

    // Banner học phí từ Module Schedule Tuition
    const tuitionBannerHtml = this.context?.scheduleTuitionMgr?.renderTuitionBanner?.() || '';

    // Khung Lịch tháng
    const calHtml = this.generateMonthCalendarHtml(this.cachedAttempts);
    const isToday = this.selectedDateStr === todayStr;
    const displayDateLabel = isToday ? `Hôm nay (${this.selectedDateStr})` : `Ngày ${this.selectedDateStr}`;

    let listHtml = `
      <div style="margin-top: 20px; border-top: 2px dashed #E8E2D8; padding-top: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <b style="font-size: 16px; color: #8B1518;">
            📝 Chi tiết ngày học: ${displayDateLabel}
          </b>
          <button type="button" onclick="window.curriculumUI.toggleListCollapse()" class="cs-cal-btn" style="cursor: pointer; padding: 6px 14px; font-size: 13px;">
            ${this.isListCollapsed ? 'Mở rộng ▼' : 'Thu gọn ▲'}
          </button>
        </div>

        <div id="csSelectedDateListBody" style="display: ${this.isListCollapsed ? 'none' : 'block'};">
    `;

    // 1. Render các buổi học trực tiếp (1-1 hoặc Nhóm)
    if (selectedSchedules.length > 0) {
      selectedSchedules.forEach(ev => {
        const isRequested = ev.status === 'reschedule_requested';
        const isDone = ev.status === 'completed';
        const isGroup = ev.isGroup || (Array.isArray(ev.studentEmails) && ev.studentEmails.length > 1);

        listHtml += `
          <div style="background: ${isGroup ? '#FAF5FF' : '#FFFBEB'}; border: 2.5px solid ${isGroup ? '#D8B4FE' : '#FCD34D'}; border-bottom: 5px solid ${isGroup ? '#9333EA' : '#F59E0B'}; border-radius: 16px; padding: 14px 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
            <div style="flex: 1; min-width: 240px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                <span style="background: ${isGroup ? '#9333EA' : '#D97706'}; color: #FFFFFF; font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
                  ${isGroup ? '👥 LỚP HỌC NHÓM' : '🏫 LỚP HỌC 1-1'}
                </span>
                ${isRequested ? '<span style="background: #EF4444; color: white; font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 6px;">⏳ ĐANG CHỜ THẦY DUYỆT DỜI LỊCH</span>' : ''}
                ${isDone ? '<span style="background: #16A34A; color: white; font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 6px;">✓ ĐÃ HỌC XONG</span>' : ''}
              </div>
              <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 900; color: ${isGroup ? '#581C87' : '#78350F'};">
                ${ev.title || 'Buổi học IELTS Trực tiếp'}
              </h4>
              <div style="font-size: 13.5px; font-weight: 800; color: ${isGroup ? '#6B21A8' : '#92400E'};">
                ⏱️ Khung giờ: <b>${ev.startTime || ''} - ${ev.endTime || ''} (2 tiếng)</b>
                ${ev.meetUrl ? ` • <a href="${ev.meetUrl}" target="_blank" style="color: #0284C7; text-decoration: underline; font-weight: 900;">🔗 Vào phòng Google Meet</a>` : ''}
              </div>
              ${isGroup ? `<div style="font-size: 12px; color: #7E22CE; margin-top: 3px; font-weight: 700;">👥 Các bạn cùng học: <b>${ev.studentName || ''}</b></div>` : ''}
              ${ev.notes ? `<div style="font-size: 12.5px; color: #78350F; margin-top: 4px; font-style: italic;">📌 Dặn dò: ${ev.notes}</div>` : ''}
              ${isRequested && ev.rescheduleRequest?.reason ? `
                <div style="font-size: 12px; color: #B91C1C; background: #FEF2F2; padding: 4px 8px; border-radius: 6px; margin-top: 6px; border: 1px solid #FECACA;">
                  💬 Lý do xin dời: <b>${ev.rescheduleRequest.reason}</b> (${ev.rescheduleRequest.suggestedTime || 'Chưa hẹn giờ'})
                </div>
              ` : ''}
            </div>

            <div>
              ${!isDone ? `
                <button type="button" onclick="window.curriculumUI.openRescheduleModal('${ev.id}', '${(ev.title || '').replace(/'/g, "\\'")}', '${this.selectedDateStr} ${ev.startTime || ''}')" class="btn-3d" style="background: #FFFFFF; color: #92400E !important; border: 2px solid #FCD34D; border-bottom: 4px solid #F59E0B; padding: 8px 14px; font-size: 12.5px; border-radius: 12px; cursor: pointer;">
                  <i class="fa-solid fa-clock-rotate-left"></i> ${isRequested ? 'Sửa yêu cầu dời' : 'Xin dời lịch'}
                </button>
              ` : ''}
            </div>
          </div>
        `;
      });
    }

    // 2. Render danh sách bài BTVN đã làm trong ngày
    if (selectedAttempts.length === 0 && selectedSchedules.length === 0) {
      listHtml += `
        <div style="text-align: center; padding: 22px 14px; background: #FAF7F2; border-radius: 16px; border: 2px dashed #E8E2D8;">
          <div style="font-size: 26px; margin-bottom: 4px;">📅</div>
          <b style="color: #261F1D; font-size: 15px;">Chưa có bài nộp hay buổi học nào trong ngày ${this.selectedDateStr}</b>
          <div style="font-size: 13px; color: #756D68; margin-top: 3px; font-weight: 700;">Nhấp vào các ô có màu trên lịch để xem lại bài nhé!</div>
        </div>
      `;
    } else {
      selectedAttempts.forEach(att => {
        const reviewLink = this.resolveReviewPageUrl(att.pageUrl, att.id, email);
        const th = this.getModuleTheme(att.moduleType, att.pageUrl, att.testTitle);

        listHtml += `
          <div class="history-item-banner" style="background: ${th.bg}; border: 2px solid ${th.border}; border-bottom: 4px solid ${th.border}; border-radius: 16px; padding: 14px 18px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="flex: 1; min-width: 240px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="background: ${th.tagBg}; color: #FFFFFF; font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
                  ${th.label}
                </span>
                <b style="font-size: 15px; color: ${th.text};">${att.testTitle || 'Bài làm'}</b>
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #64748B;">
                ⏱️ Nộp lúc: <b>${att.timestamp || ''}</b> • Làm trong: <b>${att.timeSpent || 'N/A'}</b>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="score-pill" style="background: ${th.tagBg}; color: white; padding: 6px 12px; border-radius: 12px; font-weight: 900; font-size: 13.5px;">
                Điểm: ${att.score || 'Đã nộp'}
              </span>
              <a href="${reviewLink}" target="_blank" class="btn-review" style="background: #FFFFFF; color: ${th.text}; border: 1.5px solid ${th.border}; border-bottom: 3px solid ${th.border}; text-decoration: none; padding: 6px 14px; border-radius: 12px; font-size: 13px; font-weight: 900; display: inline-flex; align-items: center; gap: 5px;">
                👁️ Xem chi tiết
              </a>
            </div>
          </div>
        `;
      });
    }

    listHtml += `</div></div>`;
    container.innerHTML = tuitionBannerHtml + calHtml + listHtml;
  }
}
