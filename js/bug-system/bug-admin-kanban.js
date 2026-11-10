/**
 * js/bug-system/bug-admin-kanban.js
 * BẢNG ĐIỀU KHIỂN QUẢN TRỊ BÁO CÁO LỖI HỌC VIÊN (ADMIN BUG KANBAN BOARD)
 * BẢN FULL HOÀN CHỈNH 100% - KÉO THẢ, TICK DONE, AUDIO PLAYER, LIGHTBOX ẢNH & BỘ LỌC
 */

import { bugStorageEngine } from './bug-storage.js';

class BugAdminKanbanManager {
  constructor() {
    this.reportsCache = [];
    this.currentFilterStatus = 'all';
    this.currentFilterModule = 'all';
    this.currentSearchKeyword = '';
    this.draggedCardId = null;

    // Đảm bảo tạo sẵn Lightbox phóng to ảnh
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.injectLightbox());
    } else {
      this.injectLightbox();
    }
  }

  // =========================================================================
  // 1. TẠO KHUNG PHÓNG TO ẢNH CHỤP MÀN HÌNH (LIGHTBOX)
  // =========================================================================
  injectLightbox() {
    if (document.getElementById('bugImageLightbox')) return;
    const lightbox = document.createElement('div');
    lightbox.id = 'bugImageLightbox';
    lightbox.innerHTML = `
      <img id="bugLightboxImg" src="" alt="Ảnh chụp màn hình phóng to">
    `;
    lightbox.addEventListener('click', () => {
      lightbox.style.display = 'none';
    });
    document.body.appendChild(lightbox);
  }

  openLightbox(imgSrc) {
    const lightbox = document.getElementById('bugImageLightbox');
    const img = document.getElementById('bugLightboxImg');
    if (lightbox && img && imgSrc) {
      img.src = imgSrc;
      lightbox.style.display = 'flex';
    }
  }

  // =========================================================================
  // 2. RENDER BẢNG ĐIỀU KHIỂN CHÍNH DÀNH CHO TAB 5 ADMIN
  // =========================================================================
  async renderAdminBugDashboard(mountElementId = 'adminBugMountPoint') {
    const container = document.getElementById(mountElementId);
    if (!container) return;

    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #64748B; font-weight: 700;">
        ⏳ Đang tải toàn bộ dữ liệu báo cáo lỗi từ học viên...
      </div>
    `;

    // 1. Lấy toàn bộ báo cáo từ IndexedDB
    this.reportsCache = await bugStorageEngine.getAllReportsFromDB();

    // 2. Tính toán thống kê nhanh
    const totalCount = this.reportsCache.length;
    const newCount = this.reportsCache.filter(r => r.status === 'new').length;
    const inProgressCount = this.reportsCache.filter(r => r.status === 'in_progress').length;
    const resolvedCount = this.reportsCache.filter(r => r.status === 'resolved').length;

    // 3. Render khung giao diện hoàn chỉnh
    container.innerHTML = `
      <div class="bug-admin-container">
        
        <!-- THỐNG KÊ NHANH -->
        <div class="bug-admin-top-stats">
          <div class="bug-stat-card" style="border-left: 5px solid #EF4444;">
            <div>
              <div class="bug-stat-num" style="color: #DC2626;">${newCount}</div>
              <div class="bug-stat-label">🔴 Lỗi mới cần kiểm tra</div>
            </div>
            <span style="font-size: 26px;">📥</span>
          </div>

          <div class="bug-stat-card" style="border-left: 5px solid #F59E0B;">
            <div>
              <div class="bug-stat-num" style="color: #D97706;">${inProgressCount}</div>
              <div class="bug-stat-label">🟡 Thầy đang sửa dở</div>
            </div>
            <span style="font-size: 26px;">🛠️</span>
          </div>

          <div class="bug-stat-card" style="border-left: 5px solid #10B981;">
            <div>
              <div class="bug-stat-num" style="color: #059669;">${resolvedCount}</div>
              <div class="bug-stat-label">🟢 Đã khắc phục xong</div>
            </div>
            <span style="font-size: 26px;">✅</span>
          </div>

          <div class="bug-stat-card" style="border-left: 5px solid #3B82F6;">
            <div>
              <div class="bug-stat-num" style="color: #2563EB;">${totalCount}</div>
              <div class="bug-stat-label">📋 Tổng số báo cáo</div>
            </div>
            <span style="font-size: 26px;">📊</span>
          </div>
        </div>

        <!-- THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC -->
        <div class="bug-admin-toolbar">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; flex: 1;">
            <input type="text" id="bugAdminSearchInput" placeholder="🔍 Tìm theo email học sinh, nội dung lỗi..." 
                   value="${this.currentSearchKeyword}" 
                   style="padding: 9px 14px; border: 2px solid #CBD5E1; border-radius: 12px; font-size: 13px; font-weight: 600; min-width: 260px; outline: none; background: #FFFFFF;">
            
            <select id="bugAdminModuleFilter" style="padding: 9px 12px; border: 2px solid #CBD5E1; border-radius: 12px; font-size: 13px; font-weight: 700; color: #334155; background: #FFFFFF; outline: none;">
              <option value="all">Tất cả phân hệ</option>
              <option value="Reading" ${this.currentFilterModule === 'Reading' ? 'selected' : ''}>Reading</option>
              <option value="Listening" ${this.currentFilterModule === 'Listening' ? 'selected' : ''}>Listening</option>
              <option value="Writing" ${this.currentFilterModule === 'Writing' ? 'selected' : ''}>Writing Task 1 & 2</option>
              <option value="Speaking" ${this.currentFilterModule === 'Speaking' ? 'selected' : ''}>Speaking</option>
              <option value="Grammar" ${this.currentFilterModule === 'Grammar' ? 'selected' : ''}>Grammar</option>
              <option value="Vocabulary" ${this.currentFilterModule === 'Vocabulary' ? 'selected' : ''}>Vocabulary</option>
            </select>
          </div>

          <div style="display: flex; gap: 8px;">
            <button type="button" id="btnRefreshBugDashboard" style="background: #FFFFFF; border: 2px solid #CBD5E1; padding: 8px 14px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; color: #475569;" title="Tải lại danh sách mới nhất">
              🔄 Làm Mới
            </button>
          </div>
        </div>

        <!-- BẢNG KANBAN 3 CỘT -->
        <div class="bug-kanban-board">
          
          <!-- CỘT 1: MỚI TIẾP NHẬN -->
          <div class="bug-kanban-column" data-status="new" id="kanbanColNew">
            <div class="bug-column-header" style="color: #DC2626;">
              <span>🔴 MỚI TIẾP NHẬN</span>
              <span class="bug-column-badge" id="badgeColNew">0</span>
            </div>
            <div class="bug-card-list" id="listColNew"></div>
          </div>

          <!-- CỘT 2: ĐANG XỬ LÝ -->
          <div class="bug-kanban-column" data-status="in_progress" id="kanbanColInProgress">
            <div class="bug-column-header" style="color: #D97706;">
              <span>🟡 ĐANG XỬ LÝ</span>
              <span class="bug-column-badge" id="badgeColInProgress">0</span>
            </div>
            <div class="bug-card-list" id="listColInProgress"></div>
          </div>

          <!-- CỘT 3: ĐÃ KHẮC PHỤC XONG (TICK DONE) -->
          <div class="bug-kanban-column" data-status="resolved" id="kanbanColResolved">
            <div class="bug-column-header" style="color: #059669;">
              <span>🟢 ĐÃ XỬ LÝ XONG</span>
              <span class="bug-column-badge" id="badgeColResolved">0</span>
            </div>
            <div class="bug-card-list" id="listColResolved"></div>
          </div>

        </div>

      </div>
    `;

    // 4. Đổ dữ liệu vào các cột Kanban
    this.populateKanbanColumns();

    // 5. Gắn sự kiện bộ lọc & Drag and drop
    this.bindDashboardEvents(mountElementId);
  }

  // =========================================================================
  // 3. ĐỔ DỮ LIỆU THẺ VÀO 3 CỘT KANBAN
  // =========================================================================
  populateKanbanColumns() {
    const listNew = document.getElementById('listColNew');
    const listInProgress = document.getElementById('listColInProgress');
    const listResolved = document.getElementById('listColResolved');

    if (!listNew || !listInProgress || !listResolved) return;

    listNew.innerHTML = '';
    listInProgress.innerHTML = '';
    listResolved.innerHTML = '';

    // Lọc theo từ khóa và phân hệ
    const filteredReports = this.reportsCache.filter(report => {
      const matchModule = (this.currentFilterModule === 'all') || (report.moduleType === this.currentFilterModule);
      const searchTarget = `${report.studentEmail} ${report.studentName} ${report.description} ${report.issueType} ${report.pageTitle}`.toLowerCase();
      const matchSearch = (!this.currentSearchKeyword) || searchTarget.includes(this.currentSearchKeyword.toLowerCase());
      return matchModule && matchSearch;
    });

    let countNew = 0;
    let countInProgress = 0;
    let countResolved = 0;

    filteredReports.forEach(report => {
      const cardHtml = this.generateCardHtml(report);
      if (report.status === 'in_progress') {
        listInProgress.insertAdjacentHTML('beforeend', cardHtml);
        countInProgress++;
      } else if (report.status === 'resolved') {
        listResolved.insertAdjacentHTML('beforeend', cardHtml);
        countResolved++;
      } else {
        listNew.insertAdjacentHTML('beforeend', cardHtml);
        countNew++;
      }
    });

    // Cập nhật số lượng đếm trên tiêu đề cột
    const bNew = document.getElementById('badgeColNew');
    const bProg = document.getElementById('badgeColInProgress');
    const bRes = document.getElementById('badgeColResolved');

    if (bNew) bNew.innerText = countNew;
    if (bProg) bProg.innerText = countInProgress;
    if (bRes) bRes.innerText = countResolved;

    // Hiển thị thông báo nếu cột trống
    if (countNew === 0) listNew.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#94A3B8; font-size:12.5px; font-weight:700;">Không có lỗi mới nào</div>`;
    if (countInProgress === 0) listInProgress.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#94A3B8; font-size:12.5px; font-weight:700;">Chưa có mục nào đang sửa</div>`;
    if (countResolved === 0) listResolved.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#94A3B8; font-size:12.5px; font-weight:700;">Chưa có mục đã hoàn thành</div>`;
  }

  // =========================================================================
  // 4. TẠO HTML CHO TỪNG THẺ LỖI (BUG CARD)
  // =========================================================================
  generateCardHtml(report) {
    // Màu mức độ ưu tiên
    let priorityColor = '#64748B';
    let priorityBg = '#F1F5F9';
    let priorityText = 'Thường';

    if (report.priority === 'urgent') {
      priorityColor = '#DC2626';
      priorityBg = '#FEE2E2';
      priorityText = '🔥 Khẩn cấp';
    } else if (report.priority === 'high') {
      priorityColor = '#EA580C';
      priorityBg = '#FFEDD5';
      priorityText = '⚠️ Ưu tiên cao';
    } else if (report.priority === 'low') {
      priorityColor = '#059669';
      priorityBg = '#D1FAE5';
      priorityText = '🟢 Thấp';
    }

    // Hiển thị player nghe giọng nếu có file ghi âm
    const audioPlayerHtml = report.audioData ? `
      <div style="margin: 8px 0; background: #F8FAFC; padding: 6px 10px; border-radius: 10px; border: 1px solid #E2E8F0; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🎙️</span>
        <audio src="${report.audioData}" controls style="height: 30px; width: 100%; outline: none;"></audio>
      </div>
    ` : '';

    // Hiển thị ảnh chụp màn hình nếu có (Click để phóng to)
    const screenshotHtml = report.screenshot ? `
      <div style="margin: 8px 0; position: relative;">
        <img src="${report.screenshot}" 
             alt="Bằng chứng lỗi" 
             onclick="window.bugAdminKanban.openLightbox('${report.screenshot}')" 
             style="max-width: 100%; height: 110px; width: 100%; object-fit: cover; border-radius: 8px; border: 1.5px solid #CBD5E1; cursor: zoom-in;" 
             title="Bấm vào để phóng to toàn màn hình">
        <span style="position: absolute; bottom: 6px; right: 6px; background: rgba(15,23,42,0.75); color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; pointer-events: none;">🔍 Phóng to</span>
      </div>
    ` : '';

    return `
      <div class="bug-card" id="card_${report.id}" draggable="true" data-report-id="${report.id}">
        
        <!-- HEADER THẺ -->
        <div class="bug-card-header">
          <span class="bug-tag-pill" style="background: ${priorityBg}; color: ${priorityColor};">
            ${priorityText}
          </span>
          <span style="font-size: 11.5px; font-weight: 800; color: #0369A1; background: #E0F2FE; padding: 2px 7px; border-radius: 6px;">
            ${report.moduleType}
          </span>
        </div>

        <!-- TIÊU ĐỀ & VẤN ĐỀ -->
        <div class="bug-card-title">
          ${report.issueType}: <span style="font-weight: 600; color: #475569;">${report.pageTitle}</span>
        </div>

        <!-- MÔ TẢ CHI TIẾT HỌC SINH VIẾT -->
        ${report.description ? `<div class="bug-card-desc">💬 "${report.description}"</div>` : ''}

        <!-- AUDIO NGHE GIỌNG HỌC SINH -->
        ${audioPlayerHtml}

        <!-- ẢNH CHỤP MÀN HÌNH BẰNG CHỨNG -->
        ${screenshotHtml}

        <!-- THÔNG TIN HỌC SINH & THỜI GIAN -->
        <div style="font-size: 11.5px; color: #64748B; margin-bottom: 8px;">
          👤 <b>${report.studentName}</b> &bull; <u style="color: #2563EB;">${report.studentEmail}</u><br>
          🕒 ${report.createdAt}
        </div>

        <!-- FOOTER & CÁC NÚT HÀNH ĐỘNG -->
        <div class="bug-card-footer">
          <!-- ĐỔI ĐỘ ƯU TIÊN -->
          <select onchange="window.bugAdminKanban.changePriority('${report.id}', this.value)" style="border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px; font-weight: 700; padding: 3px 6px; color: #475569; background: #F8FAFC;">
            <option value="normal" ${report.priority === 'normal' ? 'selected' : ''}>Ưu tiên vừa</option>
            <option value="high" ${report.priority === 'high' ? 'selected' : ''}>Ưu tiên cao</option>
            <option value="urgent" ${report.priority === 'urgent' ? 'selected' : ''}>Khẩn cấp</option>
            <option value="low" ${report.priority === 'low' ? 'selected' : ''}>Thấp</option>
          </select>

          <!-- NÚT TICK DONE & NÚT XÓA -->
          <div class="bug-card-actions">
            ${report.status !== 'resolved' ? `
              <button type="button" class="bug-btn-action-icon" onclick="window.bugAdminKanban.markResolved('${report.id}')" title="Đánh dấu đã sửa xong (Tick Done)" style="background: #DCFCE7; color: #166534; border-color: #86EFAC;">
                ✓ Xong
              </button>
            ` : `
              <button type="button" class="bug-btn-action-icon" onclick="window.bugAdminKanban.reopenReport('${report.id}')" title="Mở lại lỗi này" style="background: #FEF3C7; color: #92400E; border-color: #FDE68A;">
                🔄 Mở lại
              </button>
            `}
            
            <button type="button" class="bug-btn-action-icon" onclick="window.bugAdminKanban.deleteReport('${report.id}')" title="Xóa thẻ lỗi này" style="color: #DC2626;">
              🗑️
            </button>
          </div>
        </div>

      </div>
    `;
  }

  // =========================================================================
  // 5. GẮN SỰ KIỆN KÉO THẢ & TÌM KIẾM
  // =========================================================================
  bindDashboardEvents(mountElementId) {
    // 1. Tìm kiếm và lọc
    const searchInput = document.getElementById('bugAdminSearchInput');
    const moduleSelect = document.getElementById('bugAdminModuleFilter');
    const refreshBtn = document.getElementById('btnRefreshBugDashboard');

    let debounceTimer = null;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.currentSearchKeyword = e.target.value.trim();
        this.populateKanbanColumns();
      }, 250);
    });

    moduleSelect?.addEventListener('change', (e) => {
      this.currentFilterModule = e.target.value;
      this.populateKanbanColumns();
    });

    refreshBtn?.addEventListener('click', () => {
      this.renderAdminBugDashboard(mountElementId);
    });

    // 2. Kéo thả HTML5 Drag and Drop
    this.setupDragAndDrop(mountElementId);
  }

  setupDragAndDrop(mountElementId) {
    const cards = document.querySelectorAll('.bug-card');
    const columns = document.querySelectorAll('.bug-kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedCardId = card.getAttribute('data-report-id');
        card.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', this.draggedCardId);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
      });
    });

    columns.forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.style.background = '#F1F5F9';
      });

      col.addEventListener('dragleave', () => {
        col.style.background = '#F8FAFC';
      });

      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.style.background = '#F8FAFC';
        const reportId = e.dataTransfer.getData('text/plain') || this.draggedCardId;
        const targetStatus = col.getAttribute('data-status');

        if (reportId && targetStatus) {
          await this.changeReportStatus(reportId, targetStatus);
          this.renderAdminBugDashboard(mountElementId);
        }
      });
    });
  }

  // =========================================================================
  // 6. THAO TÁC CẬP NHẬT TRẠNG THÁI & DỮ LIỆU
  // =========================================================================
  async changeReportStatus(reportId, newStatus) {
    await bugStorageEngine.updateReportStatus(reportId, newStatus);
    const item = this.reportsCache.find(r => r.id === reportId);
    if (item) item.status = newStatus;
  }

  async markResolved(reportId) {
    await this.changeReportStatus(reportId, 'resolved');
    this.populateKanbanColumns();
  }

  async reopenReport(reportId) {
    await this.changeReportStatus(reportId, 'new');
    this.populateKanbanColumns();
  }

  async changePriority(reportId, priority) {
    await bugStorageEngine.updateReportPriority(reportId, priority);
    const item = this.reportsCache.find(r => r.id === reportId);
    if (item) item.priority = priority;
    this.populateKanbanColumns();
  }

  async deleteReport(reportId) {
    if (!confirm("⚠️ Thầy có chắc muốn xóa vĩnh viễn báo cáo lỗi này không?")) return;
    await bugStorageEngine.deleteReport(reportId);
    this.reportsCache = this.reportsCache.filter(r => r.id !== reportId);
    this.populateKanbanColumns();
  }
}

// KHỞI TẠO VÀ XUẤT RA TOÀN CỤC WINDOW
export const bugAdminKanban = new BugAdminKanbanManager();
if (typeof window !== 'undefined') {
  window.bugAdminKanban = bugAdminKanban;
}
