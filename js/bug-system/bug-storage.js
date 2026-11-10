/**
 * js/bug-system/bug-storage.js
 * ĐỘNG CƠ LƯU TRỮ VÀ XỬ LÝ DỮ LIỆU BÁO CÁO LỖI (BUG/FEEDBACK STORAGE ENGINE)
 * BẢN FULL HOÀN CHỈNH 100% - CHỐNG TRÀN BỘ NHỚ, TỰ NÉN ẢNH, LƯU ÂM THANH & ĐỒNG BỘ CLOUD
 * 
 * KIẾN TRÚC PHÒNG THỦ:
 * 1. Sử dụng IndexedDB để lưu trữ an toàn các tệp nặng (Ảnh chụp màn hình + Âm thanh ghi âm).
 * 2. Tích hợp bộ nén ảnh Canvas: Thu nhỏ ảnh màn hình (Ctrl+V) giữ nguyên chữ nét, giảm dung lượng 90%.
 * 3. Hỗ trợ đầy đủ trạng thái Admin: 'new' (Mới) | 'in_progress' (Đang sửa) | 'resolved' (Đã xong/Tick done).
 * 4. Đồng bộ nền lên Google Drive Cloud Script nếu có kết nối mạng.
 */

import { CONFIG } from '../config.js';

const BUG_DB_NAME = 'ielts_bug_system_db';
const BUG_DB_VERSION = 1;
const BUG_STORE_NAME = 'bug_reports';
const BUG_LOCAL_INDEX_KEY = 'ielts_bug_summary_index';

const CLOUD_SCRIPT_URL = (CONFIG && CONFIG.DRIVE_STORAGE_URL) 
  ? CONFIG.DRIVE_STORAGE_URL 
  : "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

class BugStorageEngine {
  constructor() {
    this.db = null;
    this.isDbReady = false;
    this.memoryFallback = [];
    this.initDatabase();
  }

  // =========================================================================
  // 1. KHỞI TẠO BỘ NHỚ LÕI INDEXEDDB (PHÒNG THỦ CRASH TRÌNH DUYỆT ẨN DANH)
  // =========================================================================
  async initDatabase() {
    if (!window.indexedDB) {
      console.warn("⚠️ Trình duyệt không hỗ trợ IndexedDB. Chuyển sang chế độ dự phòng bộ nhớ.");
      this.isDbReady = false;
      return;
    }

    try {
      const request = indexedDB.open(BUG_DB_NAME, BUG_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(BUG_STORE_NAME)) {
          const store = db.createObjectStore(BUG_STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('studentEmail', 'studentEmail', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isDbReady = true;
      };

      request.onerror = (event) => {
        console.warn("⚠️ Không thể mở IndexedDB (chế độ ẩn danh):", event.target.error);
        this.isDbReady = false;
      };
    } catch (e) {
      console.warn("⚠️ Khởi tạo IndexedDB thất bại:", e);
      this.isDbReady = false;
    }
  }

  async ensureDbConnection() {
    if (this.isDbReady && this.db) return true;
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (this.isDbReady && this.db) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts >= 10) {
          clearInterval(interval);
          resolve(false);
        }
      }, 80);
    });
  }

  // =========================================================================
  // 2. BỘ NÉN ẢNH CANVAS TỰ ĐỘNG (CHỐNG TRÀN BỘ NHỚ KHI PASTE CTRL+V)
  // =========================================================================
  async compressImage(dataUrlOrBlob, maxWidth = 1366, quality = 0.72) {
    return new Promise((resolve) => {
      try {
        if (!dataUrlOrBlob) {
          resolve(null);
          return;
        }

        const img = new Image();
        img.onload = () => {
          let targetWidth = img.width;
          let targetHeight = img.height;

          // Nếu ảnh quá lớn, co lại theo tỷ lệ giữ nguyên nét chữ đề bài
          if (targetWidth > maxWidth) {
            targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
            targetWidth = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : null);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Nén sang JPEG nhẹ
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };

        img.onerror = () => {
          resolve(typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : null);
        };

        if (typeof dataUrlOrBlob === 'string') {
          img.src = dataUrlOrBlob;
        } else if (dataUrlOrBlob instanceof Blob) {
          const reader = new FileReader();
          reader.onload = (e) => { img.src = e.target.result; };
          reader.readAsDataURL(dataUrlOrBlob);
        } else {
          resolve(null);
        }
      } catch (err) {
        console.warn("Lỗi nén ảnh:", err);
        resolve(null);
      }
    });
  }

  // =========================================================================
  // 3. TẠO BÁO CÁO MỚI (DÀNH CHO HỌC SINH GỬI BÀI)
  // =========================================================================
  async createReport(reportPayload) {
    try {
      const reportId = `bug_${Date.now()}_${Math.floor(Math.random() * 8999 + 1000)}`;
      const now = new Date();
      
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      // 1. Nén ảnh nếu có
      let processedScreenshot = null;
      if (reportPayload.screenshot) {
        processedScreenshot = await this.compressImage(reportPayload.screenshot);
      }

      // 2. Chuẩn hóa bản ghi báo cáo
      const newReport = {
        id: reportId,
        studentName: (reportPayload.studentName || localStorage.getItem('ielts_student_name') || 'Học viên').trim(),
        studentEmail: (reportPayload.studentEmail || localStorage.getItem('ielts_student_email') || 'guest').toLowerCase().trim(),
        pageUrl: reportPayload.pageUrl || (window.location.pathname + window.location.search),
        pageTitle: reportPayload.pageTitle || document.title || 'Bài tập IELTS',
        moduleType: reportPayload.moduleType || this.detectModule(window.location.pathname),
        issueType: reportPayload.issueType || 'Khác', // 'Chấm sai đáp án' | 'Thiếu lựa chọn' | 'Mất nút nộp' | 'Lỗi âm thanh' | 'Giao diện' | 'Khác'
        description: (reportPayload.description || '').trim(),
        screenshot: processedScreenshot, // Chuỗi Base64 ảnh đã nén
        audioData: reportPayload.audioData || null, // Chuỗi Base64 hoặc Blob âm thanh
        audioDuration: reportPayload.audioDuration || 0,
        status: 'new', // 'new' (Mới) | 'in_progress' (Đang sửa) | 'resolved' (Đã sửa xong)
        priority: reportPayload.priority || 'normal', // 'low' | 'normal' | 'high' | 'urgent'
        adminNote: '',
        createdAt: timeStr,
        epochTime: Date.now(),
        orderRank: Date.now() // Dùng để kéo thả thay đổi thứ tự
      };

      // 3. Ghi vào IndexedDB
      await this.saveToIndexedDB(newReport);

      // 4. Lưu bản tóm tắt nhẹ (Summary) vào LocalStorage để Admin tải danh sách tức thì
      this.updateLocalSummaryIndex(newReport);

      // 5. Bắn đồng bộ ngầm lên Cloud
      this.syncReportToCloud(newReport);

      return { success: true, report: newReport };
    } catch (e) {
      console.error("Lỗi khi tạo báo cáo lỗi:", e);
      return { success: false, error: e.message };
    }
  }

  detectModule(url = '') {
    const s = url.toLowerCase();
    if (s.includes('reading')) return 'Reading';
    if (s.includes('listening')) return 'Listening';
    if (s.includes('writing') || s.includes('pwt')) return 'Writing';
    if (s.includes('speaking')) return 'Speaking';
    if (s.includes('grammar')) return 'Grammar';
    if (s.includes('vocab')) return 'Vocabulary';
    return 'Chung';
  }

  // =========================================================================
  // 4. TƯƠNG TÁC INDEXEDDB NỘI BỘ
  // =========================================================================
  async saveToIndexedDB(report) {
    const isReady = await this.ensureDbConnection();
    if (isReady && this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([BUG_STORE_NAME], 'readwrite');
          const store = transaction.objectStore(BUG_STORE_NAME);
          const request = store.put(report);

          request.onsuccess = () => resolve(true);
          request.onerror = (e) => reject(e.target.error);
        } catch (err) {
          reject(err);
        }
      });
    } else {
      // Fallback RAM nếu không có IndexedDB
      this.memoryFallback.unshift(report);
      return true;
    }
  }

  async getAllReportsFromDB() {
    const isReady = await this.ensureDbConnection();
    if (isReady && this.db) {
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction([BUG_STORE_NAME], 'readonly');
          const store = transaction.objectStore(BUG_STORE_NAME);
          const request = store.getAll();

          request.onsuccess = (e) => {
            const list = e.target.result || [];
            // Sắp xếp mặc định: Thứ tự orderRank hoặc epochTime giảm dần
            list.sort((a, b) => (b.orderRank || b.epochTime) - (a.orderRank || a.epochTime));
            resolve(list);
          };

          request.onerror = () => {
            resolve(this.getReportsFromLocalStorageFallback());
          };
        } catch (err) {
          resolve(this.getReportsFromLocalStorageFallback());
        }
      });
    } else {
      return this.getReportsFromLocalStorageFallback();
    }
  }

  async getReportById(id) {
    const isReady = await this.ensureDbConnection();
    if (isReady && this.db) {
      return new Promise((resolve) => {
        try {
          const transaction = this.db.transaction([BUG_STORE_NAME], 'readonly');
          const store = transaction.objectStore(BUG_STORE_NAME);
          const request = store.get(id);

          request.onsuccess = (e) => resolve(e.target.result || null);
          request.onerror = () => resolve(this.memoryFallback.find(r => r.id === id) || null);
        } catch (err) {
          resolve(null);
        }
      });
    } else {
      return this.memoryFallback.find(r => r.id === id) || null;
    }
  }

  // =========================================================================
  // 5. CÁC THAO TÁC ADMIN (CẬP NHẬT TRẠNG THÁI, TICK XONG, ĐỔI THỨ TỰ, XÓA)
  // =========================================================================
  async updateReportStatus(reportId, newStatus) {
    try {
      const report = await this.getReportById(reportId);
      if (!report) return false;

      report.status = newStatus; // 'new' | 'in_progress' | 'resolved'
      report.updatedAt = Date.now();

      await this.saveToIndexedDB(report);
      this.updateLocalSummaryIndex(report, 'update');
      this.syncReportToCloud(report);
      return true;
    } catch (e) {
      console.warn("Lỗi cập nhật trạng thái lỗi:", e);
      return false;
    }
  }

  async updateReportPriority(reportId, priority) {
    try {
      const report = await this.getReportById(reportId);
      if (!report) return false;

      report.priority = priority; // 'low' | 'normal' | 'high' | 'urgent'
      await this.saveToIndexedDB(report);
      this.updateLocalSummaryIndex(report, 'update');
      return true;
    } catch (e) {
      return false;
    }
  }

  async updateReportOrder(reorderedIds = []) {
    try {
      let rank = Date.now();
      for (const id of reorderedIds) {
        const report = await this.getReportById(id);
        if (report) {
          report.orderRank = rank;
          rank -= 1000;
          await this.saveToIndexedDB(report);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async deleteReport(reportId) {
    try {
      const isReady = await this.ensureDbConnection();
      if (isReady && this.db) {
        await new Promise((resolve) => {
          const transaction = this.db.transaction([BUG_STORE_NAME], 'readwrite');
          const store = transaction.objectStore(BUG_STORE_NAME);
          const req = store.delete(reportId);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      }

      this.memoryFallback = this.memoryFallback.filter(r => r.id !== reportId);
      this.removeReportFromSummaryIndex(reportId);
      return true;
    } catch (e) {
      return false;
    }
  }

  // =========================================================================
  // 6. TÓM TẮT TRỌNG LƯỢNG NHẸ (LIGHTWEIGHT LOCAL INDEX)
  // =========================================================================
  getLocalSummaryIndex() {
    try {
      const raw = localStorage.getItem(BUG_LOCAL_INDEX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  updateLocalSummaryIndex(report, action = 'add') {
    try {
      let list = this.getLocalSummaryIndex();
      const summaryItem = {
        id: report.id,
        studentName: report.studentName,
        studentEmail: report.studentEmail,
        issueType: report.issueType,
        moduleType: report.moduleType,
        status: report.status,
        priority: report.priority,
        createdAt: report.createdAt,
        epochTime: report.epochTime,
        hasAudio: !!report.audioData,
        hasScreenshot: !!report.screenshot,
        descriptionSnippet: (report.description || '').substring(0, 90)
      };

      if (action === 'add') {
        list.unshift(summaryItem);
      } else if (action === 'update') {
        const idx = list.findIndex(item => item.id === report.id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...summaryItem };
        } else {
          list.unshift(summaryItem);
        }
      }

      // Giữ tối đa 100 báo cáo tóm tắt gần nhất trên localStorage
      if (list.length > 100) list = list.slice(0, 100);
      localStorage.setItem(BUG_LOCAL_INDEX_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Lỗi lưu index tóm tắt lỗi:", e);
    }
  }

  removeReportFromSummaryIndex(reportId) {
    try {
      let list = this.getLocalSummaryIndex().filter(r => r.id !== reportId);
      localStorage.setItem(BUG_LOCAL_INDEX_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  getReportsFromLocalStorageFallback() {
    return this.getLocalSummaryIndex();
  }

  // Lấy nhanh số lượng lỗi mới để hiện số đỏ trên Tab Admin (Badge [3])
  async getUnresolvedCount() {
    try {
      const list = this.getLocalSummaryIndex();
      return list.filter(r => r.status === 'new').length;
    } catch (e) {
      return 0;
    }
  }

  // =========================================================================
  // 7. ĐỒNG BỘ NGẦM LÊN GOOGLE DRIVE
  // =========================================================================
  syncReportToCloud(report) {
    if (!CLOUD_SCRIPT_URL) return;
    try {
      // Chỉ gửi siêu dữ liệu và text lên script để tiết kiệm băng thông
      const cloudPayload = {
        action: "save_student_bug_report",
        reportId: report.id,
        studentEmail: report.studentEmail,
        studentName: report.studentName,
        moduleType: report.moduleType,
        issueType: report.issueType,
        description: report.description,
        pageUrl: report.pageUrl,
        status: report.status,
        priority: report.priority,
        timestamp: report.createdAt,
        hasScreenshot: !!report.screenshot,
        hasAudio: !!report.audioData
      };

      fetch(CLOUD_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(cloudPayload)
      }).catch(() => {});
    } catch (e) {}
  }
}

export const bugStorageEngine = new BugStorageEngine();
if (typeof window !== 'undefined') {
  window.bugStorageEngine = bugStorageEngine;
}
