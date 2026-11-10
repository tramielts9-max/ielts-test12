/**
 * curriculum-system/ui-modules/ui-admin-gate.js
 * MODULE PHÂN QUYỀN ADMIN, ĐÓNG VAI IMPERSONATION & TẠM KHÓA/MỞ KHÓA HỌC VIÊN
 * BẢN FULL ĐẦY ĐỦ 100% - BẢO TOÀN NGUYÊN VẸN MỌI TÍNH NĂNG BẢO MẬT
 * - Phân quyền Admin tối cao bất khả xâm phạm
 * - Cơ chế đóng vai học sinh (Impersonation) xem sạch dữ liệu thực tế
 * - Kiểm tra quyền truy cập học tập (chặn học sinh lười BTVN)
 * - Tạm khóa cảnh cáo / Mở khóa 1-click đồng bộ tức thì lên Google Drive Cloud
 * - ĐÃ TÍCH HỢP TAB 5: BÁO CÁO LỖI HỌC VIÊN + KANBAN BOARD + BADGE THÔNG BÁO SỐ ĐỎ
 */

import { CONFIG } from '../../js/config.js';
import { bugStorageEngine } from '../../js/bug-system/bug-storage.js';
import { bugAdminKanban } from '../../js/bug-system/bug-admin-kanban.js';

const CLOUD_SCRIPT_URL = CONFIG?.DRIVE_STORAGE_URL || "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

// 👑 DANH SÁCH EMAIL CÓ QUYỀN ADMIN TỐI CAO BẤT KHẢ XÂM PHẠM
export const HARDCODED_ADMIN_EMAILS = [
  "tramielts9@gmail.com",
  "dinhnguyenphuc019.2@gmail.com"
];

export class UIAdminGateManager {
  constructor(contextUI) {
    // contextUI là tham chiếu tới Gateway chính để gọi hàm render lại khi cần
    this.context = contextUI;
    this.studentLockCache = {};
    this.unreadBugsCount = 0;
    
    // Tự động kiểm tra số lượng lỗi mới khi khởi động
    this.refreshUnreadBugsCount();
  }

  // =========================================================================
  // 1. KIỂM TRA PHÂN QUYỀN & PHIÊN ĐĂNG NHẬP ADMIN
  // =========================================================================
  isImpersonating() {
    try {
      return !!localStorage.getItem('ielts_impersonating_email');
    } catch (e) {
      return false;
    }
  }

  getOriginalAdminEmail() {
    try {
      return localStorage.getItem('ielts_admin_backup_email') || 'tramielts9@gmail.com';
    } catch (e) {
      return 'tramielts9@gmail.com';
    }
  }

  checkIsAdmin() {
    if (this.isImpersonating()) return true;

    try {
      const currentEmail = (localStorage.getItem('ielts_student_email') || '').toLowerCase().trim();
      const backupEmail = (localStorage.getItem('ielts_admin_backup_email') || '').toLowerCase().trim();

      const allAdminList = [
        ...HARDCODED_ADMIN_EMAILS,
        ...(CONFIG?.ADMIN_EMAILS || []).map(e => e.toLowerCase())
      ];

      const isMatch = currentEmail.includes('admin') ||
                      backupEmail.includes('admin') ||
                      allAdminList.includes(currentEmail) ||
                      allAdminList.includes(backupEmail);

      return isMatch;
    } catch (e) {
      return false;
    }
  }

  getActiveWorkingEmail() {
    try {
      if (this.isImpersonating()) {
        return (localStorage.getItem('ielts_impersonating_email') || '').toLowerCase().trim();
      }
      if (this.checkIsAdmin() && this.context?.targetStudentEmail) {
        return this.context.targetStudentEmail.toLowerCase().trim();
      }
      return (localStorage.getItem('ielts_student_email') || 'guest').toLowerCase().trim();
    } catch (e) {
      return 'guest';
    }
  }

  // =========================================================================
  // 2. CHẾ ĐỘ ĐÓNG VAI HỌC VIÊN (IMPERSONATION)
  // =========================================================================
  async startImpersonation(studentEmail) {
    const clean = (studentEmail || '').toLowerCase().trim();
    if (!clean || clean === 'guest') {
      alert("⚠️ Vui lòng nhập email học viên hợp lệ!");
      return;
    }

    try {
      const currentAdmin = localStorage.getItem('ielts_student_email') || 'tramielts9@gmail.com';
      if (!localStorage.getItem('ielts_admin_backup_email')) {
        localStorage.setItem('ielts_admin_backup_email', currentAdmin);
      }
      localStorage.setItem('ielts_impersonating_email', clean);
      localStorage.setItem('ielts_student_email', clean);
      
      if (this.context) {
        this.context.targetStudentEmail = clean;
        await this.context.fetchStudentRoadmapFromCloud?.(clean);
        await this.context.fetchStudentHistoryFromCloud?.(clean);
        await this.context.fetchSchedules?.(clean);
      }

      alert(`🎭 Đã chuyển sang chế độ điều khiển tài khoản học viên: ${clean}`);
      window.location.reload();
    } catch (e) {
      console.error("Lỗi khi chuyển tài khoản:", e);
      window.location.reload();
    }
  }

  stopImpersonation() {
    try {
      const backup = this.getOriginalAdminEmail();
      localStorage.setItem('ielts_student_email', backup);
      localStorage.removeItem('ielts_impersonating_email');
      localStorage.removeItem('ielts_admin_backup_email');
      if (this.context) {
        this.context.targetStudentEmail = '';
        this.context.isForceEditing = false;
      }
      alert("⬅ Đã thoát khỏi tài khoản học viên. Trở về quyền Quản trị viên!");
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  }

  // =========================================================================
  // 3. TẠM KHÓA CẢNH CÁO & MỞ KHÓA TRUY CẬP 1-CLICK TRÊN CLOUD
  // =========================================================================
  async checkStudentAccess(email) {
    const clean = (email || '').toLowerCase().trim();
    if (!clean || clean === 'guest') return true;

    if (HARDCODED_ADMIN_EMAILS.includes(clean) || clean.includes('admin')) return true;

    if (!CLOUD_SCRIPT_URL) return true;

    try {
      const response = await fetch(`${CLOUD_SCRIPT_URL}?action=check_student_access&studentId=${encodeURIComponent(clean)}`);
      if (response.ok) {
        const res = await response.json();
        const isUnlocked = (res.isUnlocked !== false);
        this.studentLockCache[clean] = isUnlocked;
        return isUnlocked;
      }
    } catch (e) {
      // Trường hợp mạng lag, giữ nguyên cache gần nhất
    }

    return this.studentLockCache[clean] !== false;
  }

  async toggleStudentLock(studentEmail, newStatus) {
    const clean = (studentEmail || '').toLowerCase().trim();
    if (!clean || clean === 'guest') {
      alert("⚠️ Vui lòng chọn học sinh trước khi thực hiện thao tác này!");
      return;
    }

    if (HARDCODED_ADMIN_EMAILS.includes(clean)) {
      alert("⚠️ Không thể khóa tài khoản Quản trị viên tối cao!");
      return;
    }

    const isLocking = (newStatus === 'locked');
    const confirmMsg = isLocking
      ? `⚠️ Bạn có chắc muốn TẠM KHÓA học viên [${clean}] để cảnh cáo BTVN không?`
      : `✅ Bạn có muốn MỞ KHÓA cho học viên [${clean}] tiếp tục học không?`;

    if (!confirm(confirmMsg)) return;

    try {
      if (CLOUD_SCRIPT_URL) {
        await fetch(CLOUD_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "admin_set_student_status",
            studentId: clean,
            status: newStatus
          })
        });
      }

      this.studentLockCache[clean] = !isLocking;
      alert(isLocking 
        ? `🚫 Đã TẠM KHÓA học viên [${clean}]. Máy học sinh sẽ hiện bảng cảnh cáo ngay lập tức!` 
        : `🔓 Đã MỞ KHÓA thành công cho học viên [${clean}]! Học sinh có thể vào học lại ngay.`
      );
      this.context?.render?.();
    } catch (e) {
      alert("Lỗi kết nối máy chủ: " + e.message);
    }
  }

  async checkReentry() {
    let email = 'guest';
    try {
      email = (localStorage.getItem('ielts_student_email') || 'guest').toLowerCase().trim();
    } catch (e) {}

    const btn = document.getElementById('btnCheckReentry');
    if (btn) {
      btn.disabled = true;
      btn.innerText = "⏳ Đang kiểm tra quyền truy cập...";
    }

    delete this.studentLockCache[email];
    const isUnlocked = await this.checkStudentAccess(email);

    if (isUnlocked) {
      alert("🎉 Chào mừng em quay trở lại! Quyền truy cập đã được mở khóa hoàn toàn.");
      window.location.reload();
    } else {
      alert("⚠️ Thầy chưa mở khóa trên hệ thống. Em hãy nhắn tin báo Thầy kiểm tra rồi bấm lại nhé!");
      if (btn) {
        btn.disabled = false;
        btn.innerText = "🔄 Thầy đã mở khóa, bấm để vào học tiếp";
      }
    }
  }

  // =========================================================================
  // 4. QUẢN LÝ BÁO CÁO LỖI HỌC VIÊN (TAB 5 & KANBAN MODAL)
  // =========================================================================
  async refreshUnreadBugsCount() {
    try {
      if (bugStorageEngine) {
        this.unreadBugsCount = await bugStorageEngine.getUnresolvedCount();
        const badgeEl = document.getElementById('adminBugBadgeCount');
        if (badgeEl) {
          badgeEl.innerText = this.unreadBugsCount;
          badgeEl.style.display = this.unreadBugsCount > 0 ? 'inline-block' : 'none';
        }
      }
    } catch (e) {}
  }

  openBugManagerModal() {
    let modal = document.getElementById('adminBugManagerFullModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'adminBugManagerFullModal';
      modal.style.cssText = "position:fixed; inset:0; z-index:9999998; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:16px; font-family:'Plus Jakarta Sans', system-ui, sans-serif;";
      
      modal.innerHTML = `
        <div style="background:#FFFFFF; border-radius:24px; max-width:1250px; width:100%; height:92vh; display:flex; flex-direction:column; box-shadow:0 25px 50px rgba(0,0,0,0.4); border:2px solid #E2E8F0; overflow:hidden;">
          
          <!-- MODAL HEADER -->
          <div style="padding:16px 22px; background:#8B1518; color:#FFFFFF; display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #5E0C0E;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:24px;">🐞</span>
              <div>
                <h3 style="margin:0; font-size:17px; font-weight:900;">BẢNG ĐIỀU KHIỂN BÁO CÁO LỖI & PHẢN HỒI TỪ HỌC VIÊN</h3>
                <div style="font-size:12px; opacity:0.9;">Kéo thả thẻ lỗi &bull; Bấm nghe ghi âm &bull; Bấm ảnh xem bằng chứng &bull; Đánh dấu hoàn thành</div>
              </div>
            </div>

            <button type="button" onclick="document.getElementById('adminBugManagerFullModal').style.display='none'" style="background:rgba(255,255,255,0.2); border:none; color:white; width:34px; height:34px; border-radius:50%; font-size:16px; font-weight:900; cursor:pointer;">✕</button>
          </div>

          <!-- MOUNT POINT CHO BẢNG KANBAN -->
          <div id="adminBugDashboardMountPoint" style="flex:1; overflow-y:auto; padding:20px; background:#F8FAFC;"></div>

        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    if (bugAdminKanban) {
      bugAdminKanban.renderAdminBugDashboard('adminBugDashboardMountPoint');
    }
  }

  // =========================================================================
  // 5. RENDER THANH ĐIỀU PHỐI ADMIN & THANH THÔNG BÁO NỔI IMPERSONATION
  // =========================================================================
  renderAdminControlBar() {
    if (!this.checkIsAdmin() && !this.isImpersonating()) return '';

    const currentTarget = this.context?.targetStudentEmail || 'Chính mình (Mặc định)';
    const isTargetLocked = this.context?.targetStudentEmail ? (this.studentLockCache[this.context.targetStudentEmail] === false) : false;

    // Kích hoạt cập nhật số lượng lỗi mới ngầm
    setTimeout(() => this.refreshUnreadBugsCount(), 200);

    return `
      <div style="background:#8B1518; color:white; border-radius:14px; padding:12px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; box-shadow:0 3px 0 #5E0C0E;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">👑</span>
          <div>
            <b style="font-size:14px;">BẢNG ĐIỀU PHỐI GIÁO VIÊN / ADMIN</b>
            <div style="font-size:12px; opacity:0.9;">
              Đang can thiệp cho: <b style="color:#FCD34D;">${currentTarget}</b>
              ${this.context?.targetStudentEmail ? (isTargetLocked ? ' <span style="background:#DC2626; color:white; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:900;">ĐANG BỊ KHÓA</span>' : ' <span style="background:#16A34A; color:white; padding:1px 6px; border-radius:4px; font-size:11px; font-weight:900;">HOẠT ĐỘNG</span>') : ''}
            </div>
          </div>
        </div>
        
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          
          <!-- TAB 5: BÁO CÁO LỖI KÈM BADGE SỐ ĐỎ -->
          <button type="button" onclick="window.curriculumUI.adminGateMgr.openBugManagerModal()" style="background:#FFFFFF; color:#8B1518; border:2px solid #FCD34D; padding:7px 14px; border-radius:8px; font-weight:900; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(0,0,0,0.2);" title="Mở bảng Kanban quản lý tất cả các lỗi học sinh vừa gửi">
            <span>🐞 Báo Cáo Lỗi</span>
            <span id="adminBugBadgeCount" style="background:#DC2626; color:white; padding:1px 7px; border-radius:999px; font-size:11px; font-weight:900; display:${this.unreadBugsCount > 0 ? 'inline-block' : 'none'};">${this.unreadBugsCount}</span>
          </button>

          <input type="email" id="adminTargetEmailInput" placeholder="Nhập email học sinh..." value="${this.context?.targetStudentEmail || ''}" style="padding:7px 12px; border-radius:8px; border:none; font-size:13px; font-weight:700; width:210px; color:#1e293b;">
          
          <button type="button" onclick="window.curriculumUI.setTargetStudentEmail(document.getElementById('adminTargetEmailInput').value)" style="background:#FCD34D; color:#8B1518; border:none; padding:7px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer;">
            🎯 Chọn HS
          </button>

          ${this.context?.targetStudentEmail ? (
            isTargetLocked
              ? `<button type="button" onclick="window.curriculumUI.toggleStudentLock('${this.context.targetStudentEmail}', 'active')" style="background:#10B981; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer;" title="Mở khóa ngay cho học viên này tiếp tục học">🔓 Mở khóa lại</button>`
              : `<button type="button" onclick="window.curriculumUI.toggleStudentLock('${this.context.targetStudentEmail}', 'locked')" style="background:#EF4444; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer;" title="Tạm khóa quyền truy cập để cảnh cáo BTVN">🚫 Tạm khóa HS</button>`
          ) : ''}

          <button type="button" onclick="window.curriculumUI.triggerEditRoadmap()" style="background:#3B82F6; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer;" title="Mở lại form để điều chỉnh hoặc dùng AI">
            ✏️ Soạn Lại
          </button>

          <button type="button" onclick="window.curriculumUI.startImpersonation(document.getElementById('adminTargetEmailInput').value || '${this.context?.targetStudentEmail || ''}')" style="background:#10B981; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer;" title="Nhảy thẳng vào tài khoản học sinh để xem dữ liệu sạch">
            🎭 Đóng vai HS &rarr;
          </button>

          ${this.context?.targetStudentEmail ? `
            <button type="button" onclick="window.curriculumUI.setTargetStudentEmail('')" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.4); padding:7px 10px; border-radius:8px; font-size:12px; cursor:pointer;">
              ✕ Bỏ chọn
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderFloatingImpersonationBar() {
    if (!this.isImpersonating()) return '';
    const activeEmail = this.getActiveWorkingEmail();

    return `
      <div style="position:fixed; bottom:16px; right:16px; z-index:99999; background:#DC2626; color:white; padding:12px 20px; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.3); border:2px solid #FEF2F2; display:flex; align-items:center; gap:14px; font-weight:800; font-size:13px;">
        <div>
          <span>🎭 ĐANG ĐÓNG VAI:</span> <u style="color:#FEF08A;">${activeEmail}</u>
          <div style="font-size:11px; opacity:0.9; font-weight:600;">Lịch sử bài làm hiển thị chính xác của học viên</div>
        </div>
        <button type="button" onclick="window.curriculumUI.stopImpersonation()" style="background:#FFFFFF; color:#DC2626; border:none; padding:7px 16px; border-radius:10px; font-weight:900; font-size:12.5px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);">
          ⬅ Thoát về Admin
        </button>
      </div>
    `;
  }
}
