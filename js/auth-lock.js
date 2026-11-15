/**
 * js/auth-lock.js - PHIÊN BẢN ĐÃ GỠ BỎ TOÀN BỘ KHÓA (ALWAYS-UNLOCKED STUB)
 * Giữ nguyên 100% Export & API Contract để không làm lỗi các module khác đang gọi authLockSystem
 * - Không còn lá chắn chặn tương tác (activateUniversalInteractionBarrier)
 * - Không còn kiểm tra khóa Cloud (verifyCloudAccess)
 * - Không còn Modal Zalo / Modal Cảnh cáo khóa / Admin Lock Toolbar
 */

const AUTH_STORAGE_KEYS = {
  STUDENT_ID: 'tram_student_id',
  ACCESS_STATUS: 'tram_access_status',
  ADMIN_SECRET: 'phuc_tramielts'
};

const HARDCODED_ADMINS = [
  "tramielts9@gmail.com",
  "dinhnguyenphuc019.2@gmail.com"
];

const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

class AuthLockSystem {
  constructor() {
    this.studentId = this.getOrCreateStudentID();
    this.isCloudLocked = false;

    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }
  }

  // Giữ nguyên logic nhận diện chế độ Phụ huynh xem báo cáo
  isParentView() {
    try {
      const params = new URLSearchParams(window.location.search);
      const isParentMode = params.get('mode') === 'parent';
      const isParentPage = window.location.pathname.includes('parent-report');
      return isParentMode || isParentPage;
    } catch (e) {
      return false;
    }
  }

  async init() {
    this.isCloudLocked = false;

    // Gỡ bỏ các modal/thanh khóa nếu lỡ tồn tại trong DOM
    if (typeof document !== 'undefined') {
      document.getElementById('adminLockoutModal')?.remove();
      document.getElementById('zaloConversionModal')?.remove();
      document.getElementById('floatingAdminBar')?.remove();
    }

    if (this.isParentView()) {
      return;
    }

    // Tự động đánh dấu active để các module khác tự đọc localStorage cũng qua luôn
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_STATUS, 'active');
    } catch (e) {}
  }

  // Tự sinh hoặc lấy mã học viên TR-xxxx (có bọc try/catch chống crash)
  getOrCreateStudentID() {
    try {
      let id = localStorage.getItem(AUTH_STORAGE_KEYS.STUDENT_ID);
      if (!id) {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        id = `TR-${randNum}`;
        localStorage.setItem(AUTH_STORAGE_KEYS.STUDENT_ID, id);
      }
      return id;
    } catch (e) {
      return 'TR-0000';
    }
  }

  // Luôn mở khóa hoàn toàn cho mọi người dùng
  isStudentActive() {
    this.isCloudLocked = false;
    return true;
  }

  // Vô hiệu hóa kiểm tra khóa từ xa trên Cloud
  async verifyCloudAccess() {
    this.isCloudLocked = false;
    return;
  }

  // Luôn cho phép thực thi mọi hành động, không bung modal khóa
  enforceLock(actionName = "Bài tập & Chấm thi AI") {
    return true;
  }

  // Vô hiệu hóa lá chắn chặn click/input/keydown toàn sàn
  activateUniversalInteractionBarrier() {
    return;
  }

  // --- CÁC STUB GIỮ TƯƠNG THÍCH API (KHÔNG ĐỂ MODULE NGOÀI BỊ LỖI GỌI HÀM) ---
  injectAdminLockoutModal() {
    return;
  }

  showAdminLockoutModal() {
    return;
  }

  async checkReentryFromModal() {
    this.isCloudLocked = false;
    if (typeof document !== 'undefined') {
      const modal = document.getElementById('adminLockoutModal');
      if (modal) modal.style.display = 'none';
    }
  }

  injectConversionModal() {
    return;
  }

  showConversionModal(featureName) {
    return;
  }

  hideConversionModal() {
    if (typeof document !== 'undefined') {
      const modal = document.getElementById('zaloConversionModal');
      if (modal) modal.style.display = 'none';
    }
  }

  copyStudentId() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(this.studentId).then(() => {
          alert(`Đã copy mã học viên: ${this.studentId}`);
        }).catch(() => {});
      }
    } catch (e) {}
  }

  initAdminBar() {
    return;
  }

  adminSetStudentStatus(status) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_STATUS, 'active');
    } catch (e) {}
  }
}

// KHỞI TẠO VÀ XUẤT TƯƠNG THÍCH KÉP
export const authLockSystem = new AuthLockSystem();
if (typeof window !== 'undefined') {
  window.authLockSystem = authLockSystem;
}
