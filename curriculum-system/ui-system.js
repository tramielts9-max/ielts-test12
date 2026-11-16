/**
 * curriculum-system/ui-system.js
 * CỔNG ĐIỀU PHỐI GIAO DIỆN LỘ TRÌNH & QUẢN TRỊ MASTER (GATEWAY / FACADE)
 * BẢN FULL ĐẦY ĐỦ 100% - BẢO TOÀN NGUYÊN VẸN MỌI HỢP ĐỒNG API VÀ WINDOW GLOBALS
 * - Tích hợp 4 module con: Admin Gate, Schedule Tuition, Calendar History, Roadmap Render
 * - Đảm bảo backward compatibility 100% với roadmap.html, index.html và script gọi ngoài
 * - BẢO VỆ DỮ LIỆU ĐỘT PHÁ: HỘP CÁT SANDBOX (DRAFT VS ACTIVE) CHỐNG BẤM NHẦM MẤT BÀI
 * - TỰ ĐỘNG HÓA 1-CLICK: TỰ RÚT DATA DIAGNOSTIC SANG LỘ TRÌNH QUA AI GEMINI
 * - HỖ TRỢ XUẤT FILE IN / PDF LỘ TRÌNH A4 CHUYÊN NGHIỆP
 */

import { curriculumEngineSystem } from './engine-system.js';
import { MASTER_CURRICULUM_SYSTEM } from './manifest-system.js';
import { CONFIG } from '../js/config.js';

// NẠP 4 MODULE CON CHUYÊN TRÁCH
import { UIAdminGateManager } from './ui-modules/ui-admin-gate.js';
import { UIScheduleTuitionManager } from './ui-modules/ui-schedule-tuition.js';
import { UICalendarHistoryManager } from './ui-modules/ui-calendar-history.js';
import { UIRoadmapRenderer } from './ui-modules/ui-roadmap-render.js';

const CLOUD_SCRIPT_URL = CONFIG?.DRIVE_STORAGE_URL || "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

class CurriculumUISystem {
  constructor() {
    // Khởi tạo các nút bài học vào động cơ lõi
    if (curriculumEngineSystem?.setNodes) {
      curriculumEngineSystem.setNodes(MASTER_CURRICULUM_SYSTEM);
    }

    // Biến trạng thái điều phối trung tâm
    this.targetStudentEmail = '';
    this.suppressCloudFetchForEmail = '';
    this.isForceEditing = false;

    // Khởi tạo 4 Sub-Managers chuyên biệt
    this.adminGateMgr = new UIAdminGateManager(this);
    this.scheduleTuitionMgr = new UIScheduleTuitionManager(this);
    this.calendarHistoryMgr = new UICalendarHistoryManager(this);
    this.roadmapRenderer = new UIRoadmapRenderer(this);
  }

  // =========================================================================
  // 1. QUẢN LÝ BỘ NHỚ LỘ TRÌNH LOCAL & CLOUD STORAGE (CÓ HỘP CÁT DRAFT SANDBOX)
  // =========================================================================
  getStorageKey(email) {
    const clean = (email || this.getActiveWorkingEmail()).toLowerCase().trim();
    return `ielts_roadmap_data_${clean}`;
  }

  // Key dành riêng cho Bản Nháp Sandbox (Chống ghi đè mất lộ trình chính)
  getDraftStorageKey(email) {
    const clean = (email || this.getActiveWorkingEmail()).toLowerCase().trim();
    return `ielts_roadmap_draft_${clean}`;
  }

  // Lấy Lộ Trình Đang Chạy Chính Thức (Active Roadmap)
  getSavedRoadmap(email) {
    try {
      const target = (email || this.getActiveWorkingEmail()).toLowerCase().trim();
      const raw = localStorage.getItem(this.getStorageKey(target));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Lấy Bản Nháp Đang Soạn (Nếu có)
  getDraftRoadmap(email) {
    try {
      const target = (email || this.getActiveWorkingEmail()).toLowerCase().trim();
      const raw = localStorage.getItem(this.getDraftStorageKey(target));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Lưu tạm thời vào Bản Nháp (Chưa đè lên Active Roadmap)
  saveDraftRoadmap(email, draftData) {
    try {
      const target = (email || this.getActiveWorkingEmail()).toLowerCase().trim();
      localStorage.setItem(this.getDraftStorageKey(target), JSON.stringify(draftData));
    } catch (e) {
      console.warn("Lỗi lưu bản nháp roadmap:", e);
    }
  }

  // Xóa Bản Nháp khi hủy bỏ hoặc sau khi đã duyệt
  clearDraftRoadmap(email) {
    try {
      const target = (email || this.getActiveWorkingEmail()).toLowerCase().trim();
      localStorage.removeItem(this.getDraftStorageKey(target));
    } catch (e) {}
  }

  // Hủy Bỏ Soạn Lại: Khôi phục nguyên vẹn 100% Lộ Trình Cũ (Chống mất bài khi bấm nhầm)
  cancelEditRoadmap() {
    const target = this.getActiveWorkingEmail();
    this.clearDraftRoadmap(target);
    this.isForceEditing = false;
    this.render();
  }

  // Phê Duyệt & Ghi Đè Bản Nháp Thành Lộ Trình Chính Thức
  commitDraftRoadmap(email) {
    const target = (email || this.getActiveWorkingEmail()).toLowerCase().trim();
    const draft = this.getDraftRoadmap(target);
    if (!draft) return false;

    this.saveRoadmap(target, draft);
    this.clearDraftRoadmap(target);
    this.isForceEditing = false;
    this.render();
    return true;
  }

  saveRoadmap(email, data) {
    try {
      const target = (email || this.getActiveWorkingEmail()).toLowerCase().trim();
      localStorage.setItem(this.getStorageKey(target), JSON.stringify(data));
      this.syncRoadmapToCloud(target, data);
    } catch (e) {
      console.warn("Lỗi lưu trữ roadmap:", e);
    }
  }

  syncRoadmapToCloud(email, roadmapData) {
    if (!CLOUD_SCRIPT_URL) return;
    try {
      fetch(CLOUD_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "save_student_roadmap",
          studentEmail: email,
          roadmap: roadmapData
        })
      }).catch(() => {});
    } catch (e) {}
  }

  async fetchStudentRoadmapFromCloud(email) {
    if (!CLOUD_SCRIPT_URL || !email || email === 'guest') return null;
    try {
      const response = await fetch(`${CLOUD_SCRIPT_URL}?action=get_student_roadmap&studentEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const cloudData = await response.json();
        if (cloudData && cloudData.roadmap) {
          try {
            localStorage.setItem(this.getStorageKey(email), JSON.stringify(cloudData.roadmap));
          } catch (e) {}
          return cloudData.roadmap;
        }
      }
    } catch (e) {}
    return null;
  }

  async fetchStudentHistoryFromCloud(email) {
    if (!CLOUD_SCRIPT_URL || !email || email === 'guest') return [];
    try {
      const response = await fetch(`${CLOUD_SCRIPT_URL}?action=get_student_history&studentEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const cloudData = await response.json();
        const attempts = cloudData.attempts || [];
        try {
          localStorage.setItem(`ielts_history_${email}`, JSON.stringify(attempts));
        } catch (e) {}
        return attempts;
      }
    } catch (e) {}
    return [];
  }

  // =========================================================================
  // 2. ỦY QUYỀN (DELEGATION) MODULE 1: ADMIN GATE & IMPERSONATION
  // =========================================================================
  isImpersonating() {
    return this.adminGateMgr.isImpersonating();
  }

  getOriginalAdminEmail() {
    return this.adminGateMgr.getOriginalAdminEmail();
  }

  checkIsAdmin() {
    return this.adminGateMgr.checkIsAdmin();
  }

  getActiveWorkingEmail() {
    return this.adminGateMgr.getActiveWorkingEmail();
  }

  setTargetStudentEmail(email) {
    this.targetStudentEmail = (email || '').toLowerCase().trim();
    this.isForceEditing = false;
    this.render();
  }

  // Bấm Soạn Lại: Chuyển sang Sandbox Draft, giữ nguyên lộ trình cũ
  triggerEditRoadmap() {
    this.isForceEditing = true;
    this.render();
  }

  async startImpersonation(studentEmail) {
    return this.adminGateMgr.startImpersonation(studentEmail);
  }

  stopImpersonation() {
    return this.adminGateMgr.stopImpersonation();
  }

  async checkStudentAccess(email) {
    return this.adminGateMgr.checkStudentAccess(email);
  }

  async toggleStudentLock(studentEmail, newStatus) {
    return this.adminGateMgr.toggleStudentLock(studentEmail, newStatus);
  }

  async checkReentry() {
    return this.adminGateMgr.checkReentry();
  }

  renderAdminControlBar() {
    return this.adminGateMgr.renderAdminControlBar();
  }

  renderFloatingImpersonationBar() {
    return this.adminGateMgr.renderFloatingImpersonationBar();
  }

  // =========================================================================
  // 3. ỦY QUYỀN (DELEGATION) MODULE 2: SCHEDULE & TUITION
  // =========================================================================
  async fetchSchedules(email) {
    return this.scheduleTuitionMgr.fetchSchedules(email);
  }

  async fetchStudentTuition(email) {
    return this.scheduleTuitionMgr.fetchStudentTuition(email);
  }

  openRescheduleModal(eventId, title, currentDateTime) {
    return this.scheduleTuitionMgr.openRescheduleModal(eventId, title, currentDateTime);
  }

  closeRescheduleModal() {
    return this.scheduleTuitionMgr.closeRescheduleModal();
  }

  async submitRescheduleRequest() {
    return this.scheduleTuitionMgr.submitRescheduleRequest();
  }

  // =========================================================================
  // 4. ỦY QUYỀN (DELEGATION) MODULE 3: CALENDAR & HISTORY
  // =========================================================================
  getNodeCompletionInfo(node, specifiedEmail = null) {
    return this.calendarHistoryMgr.getNodeCompletionInfo(node, specifiedEmail);
  }

  isNodeCompletedInHistory(node) {
    return this.calendarHistoryMgr.isNodeCompletedInHistory(node);
  }

  getModuleTheme(moduleType, url = '', title = '') {
    return this.calendarHistoryMgr.getModuleTheme(moduleType, url, title);
  }

  getFormattedDate(d) {
    return this.calendarHistoryMgr.getFormattedDate(d);
  }

  calculateStreak(uniqueDatesSet) {
    return this.calendarHistoryMgr.calculateStreak(uniqueDatesSet);
  }

  resolveReviewPageUrl(pageUrl, id, email) {
    return this.calendarHistoryMgr.resolveReviewPageUrl(pageUrl, id, email);
  }

  selectCalendarDate(day, month, year) {
    return this.calendarHistoryMgr.selectCalendarDate(day, month, year);
  }

  toggleListCollapse() {
    return this.calendarHistoryMgr.toggleListCollapse();
  }

  changeCalMonth(delta) {
    return this.calendarHistoryMgr.changeCalMonth(delta);
  }

  generateMonthCalendarHtml(attempts) {
    return this.calendarHistoryMgr.generateMonthCalendarHtml(attempts);
  }

  renderTodayHistoryAndCalendar(attempts = [], email = '') {
    return this.calendarHistoryMgr.renderTodayHistoryAndCalendar(attempts, email);
  }

  // =========================================================================
  // 5. ỦY QUYỀN (DELEGATION) MODULE 4: ROADMAP RENDER, TỰ ĐỘNG HÓA & PDF EXPORT
  // =========================================================================
  toggleMicrophone() {
    return this.roadmapRenderer.toggleMicrophone();
  }

  handleFileUpload(file) {
    return this.roadmapRenderer.handleFileUpload(file);
  }

  async runAIDiagnostic() {
    return this.roadmapRenderer.runAIDiagnostic();
  }

  // Tự động hóa 1-Click: Tự đọc bài Diagnostic gần nhất & sinh lộ trình qua AI
  async autoGenerateFromLatestDiagnostic(studentEmail) {
    return this.roadmapRenderer.autoGenerateFromLatestDiagnostic(studentEmail);
  }

  applyBandRoadmap(startBand, targetBand, aiData = null) {
    return this.roadmapRenderer.applyBandRoadmap(startBand, targetBand, aiData);
  }

  resetRoadmap() {
    return this.roadmapRenderer.resetRoadmap();
  }

  findRecentDiagnosticAttempt(email) {
    return this.roadmapRenderer.findRecentDiagnosticAttempt(email);
  }

  async approveStudentRoadmap(studentEmail) {
    return this.roadmapRenderer.approveStudentRoadmap(studentEmail);
  }

  renderAdminPendingApprovalCard(data, studentEmail) {
    return this.roadmapRenderer.renderAdminPendingApprovalCard(data, studentEmail);
  }

  renderStudentPendingGate(data, studentEmail) {
    return this.roadmapRenderer.renderStudentPendingGate(data, studentEmail);
  }

  // Kích hoạt In / Xuất PDF Lộ Trình
  triggerPrintRoadmap() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  async render(targetContainerId = 'roadmapSectionMount') {
    return this.roadmapRenderer.renderRoadmap(targetContainerId);
  }
}

export const curriculumUI = new CurriculumUISystem();

// GẮN CHẶT VÀO WINDOW ĐẢM BẢO ROADMAP.HTML VÀ CÁC THẺ BUTTON KHÔNG BỊ LỖI
if (typeof window !== 'undefined') {
  window.curriculumUI = curriculumUI;
  window.triggerPrintRoadmap = () => curriculumUI.triggerPrintRoadmap();
  window.cancelEditRoadmap = () => curriculumUI.cancelEditRoadmap();
}
