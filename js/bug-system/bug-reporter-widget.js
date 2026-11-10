/**
 * js/bug-system/bug-reporter-widget.js
 * WIDGET BÁO CÁO LỖI HỌC VIÊN: BONG BÓNG NỔI + DÁN ẢNH CTRL+V + MIC GHI ÂM
 * BẢN FULL HOÀN CHỈNH 100% - KHÔNG CẮT BỚT, TỰ ĐỘNG TIÊM DOM VÀ PHÒNG THỦ LỖI
 */

import { bugStorageEngine } from './bug-storage.js';

class BugReporterWidget {
  constructor() {
    this.isOpen = false;
    this.currentScreenshot = null;
    this.currentAudioBlob = null;
    this.currentAudioBase64 = null;
    
    // Trạng thái ghi âm Mic
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordTimer = null;
    this.recordSeconds = 0;
    this.audioStream = null;

    // Chờ DOM sẵn sàng trước khi dựng giao diện
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  // =========================================================================
  // 1. KHỞI TẠO VÀ TỰ ĐỘNG TIÊM GIAO DIỆN (AUTO-INJECT)
  // =========================================================================
  init() {
    try {
      this.ensureStylesheetLoaded();
      this.injectFloatingBubble();
      this.injectModal();
      this.setupGlobalClipboardPaste();
    } catch (e) {
      console.warn("Lỗi khởi tạo BugReporterWidget:", e);
    }
  }

  ensureStylesheetLoaded() {
    if (document.getElementById('bugSystemCssLink')) return;
    const link = document.createElement('link');
    link.id = 'bugSystemCssLink';
    link.rel = 'stylesheet';
    
    // Tự dò đường dẫn tương đối phù hợp với mọi thư mục con
    const isSubFolder = window.location.pathname.split('/').filter(Boolean).length > 1;
    link.href = isSubFolder ? '../js/bug-system/bug-system.css' : 'js/bug-system/bug-system.css';
    document.head.appendChild(link);
  }

  // =========================================================================
  // 2. DỰNG BONG BÓNG NỔI GÓC MÀN HÌNH
  // =========================================================================
  injectFloatingBubble() {
    if (document.getElementById('bugReporterBubble')) return;

    const bubble = document.createElement('div');
    bubble.id = 'bugReporterBubble';
    bubble.title = 'Báo cáo lỗi bài làm cho Thầy (Có hỗ trợ chụp màn hình & thu âm)';
    bubble.innerHTML = `
      <span class="bug-bubble-icon">🐞</span>
      <span>Báo Lỗi Bài</span>
    `;

    bubble.addEventListener('click', () => this.openModal());
    document.body.appendChild(bubble);
  }

  // =========================================================================
  // 3. DỰNG MODAL BÁO LỖI HOÀN CHỈNH
  // =========================================================================
  injectModal() {
    if (document.getElementById('bugReportModal')) return;

    const modal = document.createElement('div');
    modal.id = 'bugReportModal';
    modal.innerHTML = `
      <div class="bug-modal-card">
        <!-- HEADER -->
        <div class="bug-modal-header">
          <h3 class="bug-modal-title">
            <span>🐞</span>
            <span>Báo Cáo Lỗi Bài Làm & Góp Ý</span>
          </h3>
          <button type="button" class="bug-modal-close-btn" id="btnBugCloseModal" title="Đóng bảng">✕</button>
        </div>

        <!-- THÔNG TIN VỊ TRÍ TỰ ĐỘNG -->
        <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:8px 12px; margin-bottom:14px; font-size:12px; color:#92400E; display:flex; justify-content:space-between; align-items:center;">
          <div>📍 Vị trí: <b id="bugLocationTitle">${document.title || 'Bài làm IELTS'}</b></div>
          <span style="background:#FCD34D; color:#78350F; padding:1px 6px; border-radius:4px; font-weight:800; font-size:11px;" id="bugLocationModule">Tự động nhận diện</span>
        </div>

        <!-- FORM NHẬP LIỆU -->
        <div class="bug-form-group">
          <label class="bug-form-label">Phân loại vấn đề gặp phải:</label>
          <select id="bugIssueTypeSelect" class="bug-select">
            <option value="Chấm sai đáp án">❌ Chấm sai đáp án / Kết quả không đúng</option>
            <option value="Thiếu lựa chọn đề">⚠️ Đề bài thiếu đáp án / Lựa chọn bị lỗi</option>
            <option value="Mất nút nộp bài">🔘 Bị mất nút nộp bài / Không nộp được</option>
            <option value="Lỗi âm thanh">🔊 Lỗi audio nghe / File nghe không chạy</option>
            <option value="Lỗi giao diện">📱 Lỗi giao diện / Chữ bị che / Vỡ khung</option>
            <option value="Khác" selected>💬 Vấn đề kỹ thuật khác / Góp ý</option>
          </select>
        </div>

        <div class="bug-form-group">
          <label class="bug-form-label">Mô tả chi tiết lỗi:</label>
          <textarea id="bugDescriptionInput" class="bug-textarea" placeholder="Em đang làm câu số mấy, đề bài gặp hiện tượng gì, đáp án đúng theo em là gì..."></textarea>
        </div>

        <!-- ẢNH CHỤP MÀN HÌNH (PASTE CTRL+V HOẶC UPLOAD) -->
        <div class="bug-form-group">
          <label class="bug-form-label">Bằng chứng ảnh chụp màn hình (Chụp rồi bấm Ctrl+V để dán):</label>
          <div class="bug-paste-zone" id="bugPasteZone">
            <div class="bug-paste-zone-text" id="bugPasteZoneText">
              📸 <b>Bấm Ctrl + V để dán ảnh màn hình vào đây</b><br>
              <span style="font-size:11px; color:#64748B;">(Hoặc kéo thả file ảnh / nhấp vào để tải ảnh lên)</span>
            </div>
            <input type="file" id="bugFileInput" accept="image/*" style="display:none;">

            <div class="bug-preview-img-box" id="bugImgPreviewBox" style="display:none;">
              <img id="bugImgPreview" class="bug-preview-img" alt="Ảnh lỗi">
              <button type="button" class="bug-remove-img-btn" id="btnRemoveBugImg" title="Xóa ảnh này">✕</button>
            </div>
          </div>
        </div>

        <!-- GHI ÂM GIỌNG NÓI MÔ TẢ (VOICE NOTE) -->
        <div class="bug-form-group">
          <label class="bug-form-label">Ghi âm mô tả nhanh (Nếu em lười gõ chữ):</label>
          <div class="bug-audio-controls">
            <button type="button" class="bug-btn-record" id="btnBugToggleRecord">
              <span id="bugRecIcon">🎙️</span>
              <span id="bugRecLabel">Bấm để nói</span>
            </button>
            <span id="bugRecTimer" style="font-size:12.5px; font-weight:800; color:#DC2626; display:none;">00:00</span>
            <audio id="bugAudioPreview" class="bug-audio-player-mini" controls style="display:none;"></audio>
            <button type="button" id="btnBugRemoveAudio" style="background:#F1F5F9; border:1px solid #CBD5E1; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:700; color:#64748B; cursor:pointer; display:none;">✕ Thu lại</button>
          </div>
        </div>

        <!-- NÚT GỬI -->
        <button type="button" class="bug-btn-submit" id="btnBugSubmitReport">
          <span>🚀</span>
          <span>Gửi Báo Cáo Lỗi Lên Thầy</span>
        </button>

      </div>
    `;

    document.body.appendChild(modal);
    this.bindEvents();
  }

  // =========================================================================
  // 4. GẮN SỰ KIỆN TƯƠNG TÁC
  // =========================================================================
  bindEvents() {
    // Đóng modal
    document.getElementById('btnBugCloseModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('bugReportModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'bugReportModal') this.closeModal();
    });

    // Mở file picker khi click khung dán
    const pasteZone = document.getElementById('bugPasteZone');
    const fileInput = document.getElementById('bugFileInput');
    pasteZone?.addEventListener('click', (e) => {
      if (e.target.id === 'btnRemoveBugImg' || e.target.closest('#btnRemoveBugImg')) return;
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleImageFile(file);
    });

    // Drag and drop ảnh
    pasteZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      pasteZone.classList.add('drag-over');
    });
    pasteZone?.addEventListener('dragleave', () => pasteZone.classList.remove('drag-over'));
    pasteZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      pasteZone.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        this.handleImageFile(file);
      }
    });

    // Xóa ảnh đã chọn
    document.getElementById('btnRemoveBugImg')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearScreenshot();
    });

    // Nút ghi âm Mic
    document.getElementById('btnBugToggleRecord')?.addEventListener('click', () => this.toggleVoiceRecording());
    document.getElementById('btnBugRemoveAudio')?.addEventListener('click', () => this.clearAudioRecording());

    // Nút submit báo cáo
    document.getElementById('btnBugSubmitReport')?.addEventListener('click', () => this.submitReport());
  }

  // =========================================================================
  // 5. XỬ LÝ DÁN ẢNH TỪ CLIPBOARD (CTRL + V)
  // =========================================================================
  setupGlobalClipboardPaste() {
    window.addEventListener('paste', (e) => {
      if (!this.isOpen) return; // Chỉ bắt Ctrl+V khi modal đang mở

      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            this.handleImageFile(blob);
            break;
          }
        }
      }
    });
  }

  async handleImageFile(fileOrBlob) {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawBase64 = e.target.result;
        // Tự động nén qua canvas
        const compressed = await bugStorageEngine.compressImage(rawBase64);
        this.currentScreenshot = compressed || rawBase64;

        // Cập nhật giao diện preview
        const img = document.getElementById('bugImgPreview');
        const box = document.getElementById('bugImgPreviewBox');
        const text = document.getElementById('bugPasteZoneText');

        if (img && box && text) {
          img.src = this.currentScreenshot;
          box.style.display = 'inline-block';
          text.style.display = 'none';
        }
      };
      reader.readAsDataURL(fileOrBlob);
    } catch (err) {
      console.warn("Lỗi đọc file ảnh:", err);
    }
  }

  clearScreenshot() {
    this.currentScreenshot = null;
    const box = document.getElementById('bugImgPreviewBox');
    const text = document.getElementById('bugPasteZoneText');
    const fileInput = document.getElementById('bugFileInput');

    if (box) box.style.display = 'none';
    if (text) text.style.display = 'block';
    if (fileInput) fileInput.value = '';
  }

  // =========================================================================
  // 6. XỬ LÝ GHI ÂM GIỌNG NÓI MICROPHONE
  // =========================================================================
  async toggleVoiceRecording() {
    if (!this.isRecording) {
      await this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  async startRecording() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.audioStream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        this.currentAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Chuẩn bị URL phát nghe thử
        const audioUrl = URL.createObjectURL(this.currentAudioBlob);
        const player = document.getElementById('bugAudioPreview');
        const removeBtn = document.getElementById('btnBugRemoveAudio');

        if (player) {
          player.src = audioUrl;
          player.style.display = 'inline-block';
        }
        if (removeBtn) removeBtn.style.display = 'inline-block';

        // Đọc sang Base64 để lưu trữ IndexedDB
        const reader = new FileReader();
        reader.onloadend = () => {
          this.currentAudioBase64 = reader.result;
        };
        reader.readAsDataURL(this.currentAudioBlob);

        // Tắt stream micro để giải phóng thiết bị
        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop());
          this.audioStream = null;
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordSeconds = 0;

      // Cập nhật giao diện nút thu
      const btn = document.getElementById('btnBugToggleRecord');
      const label = document.getElementById('bugRecLabel');
      const icon = document.getElementById('bugRecIcon');
      const timer = document.getElementById('bugRecTimer');

      btn?.classList.add('recording');
      if (label) label.innerText = "Dừng nói & Lưu";
      if (icon) icon.innerText = "■";
      if (timer) {
        timer.style.display = 'inline-block';
        timer.innerText = "00:00";
      }

      this.recordTimer = setInterval(() => {
        this.recordSeconds++;
        const m = String(Math.floor(this.recordSeconds / 60)).padStart(2, '0');
        const s = String(this.recordSeconds % 60).padStart(2, '0');
        if (timer) timer.innerText = `${m}:${s}`;
        
        // Giới hạn 2 phút để file không quá nặng
        if (this.recordSeconds >= 120) {
          this.stopRecording();
        }
      }, 1000);

    } catch (err) {
      alert("⚠️ Không thể truy cập Micro: " + err.message + "\nEm hãy kiểm tra và cấp quyền micro cho trình duyệt nhé!");
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    clearInterval(this.recordTimer);

    const btn = document.getElementById('btnBugToggleRecord');
    const label = document.getElementById('bugRecLabel');
    const icon = document.getElementById('bugRecIcon');
    const timer = document.getElementById('bugRecTimer');

    btn?.classList.remove('recording');
    if (label) label.innerText = "Thu lại âm thanh khác";
    if (icon) icon.innerText = "🎙️";
    if (timer) timer.style.display = 'none';
  }

  clearAudioRecording() {
    this.currentAudioBlob = null;
    this.currentAudioBase64 = null;
    this.recordSeconds = 0;

    const player = document.getElementById('bugAudioPreview');
    const removeBtn = document.getElementById('btnBugRemoveAudio');
    const label = document.getElementById('bugRecLabel');

    if (player) {
      player.src = '';
      player.style.display = 'none';
    }
    if (removeBtn) removeBtn.style.display = 'none';
    if (label) label.innerText = "Bấm để nói";
  }

  // =========================================================================
  // 7. MỞ / ĐÓNG MODAL VÀ ĐIỀU PHỐI DỮ LIỆU
  // =========================================================================
  openModal() {
    this.isOpen = true;
    const modal = document.getElementById('bugReportModal');
    if (modal) modal.style.display = 'flex';

    // Tự động nhận diện phân hệ & tiêu đề
    const modTag = document.getElementById('bugLocationModule');
    const titleTag = document.getElementById('bugLocationTitle');

    const detectedMod = bugStorageEngine.detectModule(window.location.pathname);
    if (modTag) modTag.innerText = detectedMod;
    if (titleTag) titleTag.innerText = document.title || 'Bài tập IELTS';
  }

  closeModal() {
    if (this.isRecording) {
      this.stopRecording();
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(t => t.stop());
      this.audioStream = null;
    }

    this.isOpen = false;
    const modal = document.getElementById('bugReportModal');
    if (modal) modal.style.display = 'none';
  }

  // =========================================================================
  // 8. NỘP BÁO CÁO LỖI LÊN HỆ THỐNG
  // =========================================================================
  async submitReport() {
    const issueType = document.getElementById('bugIssueTypeSelect')?.value || 'Khác';
    const description = document.getElementById('bugDescriptionInput')?.value?.trim() || '';
    const submitBtn = document.getElementById('btnBugSubmitReport');

    // Kiểm tra tối thiểu: Phải có chữ, hoặc có ảnh, hoặc có âm thanh
    if (!description && !this.currentScreenshot && !this.currentAudioBase64) {
      alert("⚠️ Em hãy gõ mô tả ngắn, dán ảnh màn hình hoặc ghi âm giọng nói trước khi gửi nhé!");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>⏳</span> <span>Đang gửi báo cáo lên Thầy...</span>`;
    }

    const payload = {
      issueType: issueType,
      description: description,
      screenshot: this.currentScreenshot,
      audioData: this.currentAudioBase64,
      audioDuration: this.recordSeconds,
      pageUrl: window.location.pathname + window.location.search,
      pageTitle: document.title || 'Bài làm IELTS',
      moduleType: bugStorageEngine.detectModule(window.location.pathname)
    };

    const res = await bugStorageEngine.createReport(payload);

    if (res.success) {
      alert("🎉 Cám ơn em! Thầy đã nhận được báo cáo lỗi chi tiết. Thầy sẽ kiểm tra và khắc phục sớm nhất có thể nhé!");
      
      // Reset form
      if (document.getElementById('bugDescriptionInput')) {
        document.getElementById('bugDescriptionInput').value = '';
      }
      this.clearScreenshot();
      this.clearAudioRecording();
      this.closeModal();
    } else {
      alert("❌ Không thể gửi báo cáo: " + (res.error || "Lỗi không xác định"));
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>🚀</span> <span>Gửi Báo Cáo Lỗi Lên Thầy</span>`;
    }
  }
}

// KHỞI TẠO TỰ ĐỘNG VÀ ĐẢM BẢO TỒN TẠI TRÊN WINDOW
export const bugReporterWidget = new BugReporterWidget();
if (typeof window !== 'undefined') {
  window.bugReporterWidget = bugReporterWidget;
}
