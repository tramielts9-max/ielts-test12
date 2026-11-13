/**
 * reading/js-r/subsystem-admin-editor.js
 * PANEL ADMIN ĐIỀU CHỈNH PHÂN HỆ READING & DẠNG BÀI P1 / P2 / P3 TRỰC QUAN
 * (CHỈ HIỂN THỊ KHI ĐĂNG NHẬP EMAIL ADMIN HOẶC MỞ VỚI THAM SỐ ?admin)
 */

import { CONFIG } from '../../js/config.js';
import { stateManager } from '../../js/state.js';
import {
  getActiveSubsystemsConfig,
  saveSubsystemsOverride,
  resetSubsystemsOverride,
  exportSubsystemsConfigJson
} from './reading-subsystems.config.js';
import { renderReadingCatalog } from './catalog-renderer.js';

let draftConfig = null;
let activeAdminPassage = 'p1';

function escapeHtml(str) {
  try {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  } catch (e) {
    return '';
  }
}

export function isReadingAdmin() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('admin')) return true;
    const user = stateManager.getUser();
    const email = String(user?.email || '').trim().toLowerCase();
    const backup = String(localStorage.getItem('ielts_admin_backup_email') || '').trim().toLowerCase();
    const admins = Array.isArray(CONFIG?.ADMIN_EMAILS) ? CONFIG.ADMIN_EMAILS.map(e => String(e).toLowerCase()) : [];
    return Boolean((email && admins.includes(email)) || (backup && admins.includes(backup)));
  } catch (e) {
    return false;
  }
}

function ensureAdminModalMounted() {
  if (document.getElementById('subsystemAdminModal')) return;
  const modalHtml = `
    <div id="subsystemAdminModal" class="rd-admin-modal-backdrop" style="display:none;">
      <div class="rd-admin-modal-card">
        <div class="rd-admin-modal-header">
          <div>
            <h3 style="margin:0; font-size:18px; font-weight:900; color:#8B1518;">⚙️ Điều Chỉnh Các Phân Hệ Reading</h3>
            <p style="margin:3px 0 0 0; font-size:12.5px; font-weight:700; color:#64748B;">Tùy biến ẩn/hiện, đổi tên, sắp xếp phân hệ và cây kỹ năng P1 / P2 / P3</p>
          </div>
          <button type="button" class="rd-admin-close-btn" onclick="window.closeSubsystemAdminModal()">✕</button>
        </div>
        <div id="subsystemAdminModalBody" class="rd-admin-modal-body"></div>
        <div class="rd-admin-modal-footer">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="rd-admin-btn rd-admin-btn-gray" onclick="window.resetAdminSubsystems()">🔄 Mặc định</button>
            <button type="button" class="rd-admin-btn rd-admin-btn-blue" onclick="window.exportAdminSubsystems()">📥 Xuất JSON</button>
            <label class="rd-admin-btn rd-admin-btn-blue" style="cursor:pointer; margin:0;">
              📤 Nhập JSON
              <input type="file" accept=".json" style="display:none;" onchange="window.importAdminSubsystems(event)">
            </label>
          </div>
          <button type="button" class="rd-admin-btn rd-admin-btn-green" onclick="window.saveAdminSubsystems()">💾 Lưu & Áp dụng</button>
        </div>
      </div>
    </div>
  `;
  document.body?.insertAdjacentHTML('beforeend', modalHtml);
}

function renderAdminModalBody() {
  const body = document.getElementById('subsystemAdminModalBody');
  if (!body || !draftConfig) return;

  const subs = Array.isArray(draftConfig.subsystems) ? draftConfig.subsystems : [];
  const tree = draftConfig.skillTree || {};
  const currentGroup = tree[activeAdminPassage] || { title: '', subtitle: '', skills: [] };
  const skills = Array.isArray(currentGroup.skills) ? currentGroup.skills : [];

  body.innerHTML = `
    <div class="rd-admin-section">
      <h4 class="rd-admin-sec-title">1. Danh sách Phân Hệ Chính</h4>
      <div class="rd-admin-list">
        ${subs.map((sub, idx) => `
          <div class="rd-admin-row">
            <label style="display:flex; align-items:center; gap:6px; font-weight:800; min-width:90px;">
              <input type="checkbox" ${sub.enabled !== false ? 'checked' : ''} onchange="window.updateDraftSub(${idx}, 'enabled', this.checked)">
              <span>Bật (${escapeHtml(sub.id)})</span>
            </label>
            <input type="text" class="rd-admin-inp" style="flex:2;" value="${escapeHtml(sub.label)}" placeholder="Tên hiển thị" oninput="window.updateDraftSub(${idx}, 'label', this.value)">
            <input type="text" class="rd-admin-inp" style="flex:1;" value="${escapeHtml(sub.badgeText || '')}" placeholder="Nhãn phụ" oninput="window.updateDraftSub(${idx}, 'badgeText', this.value)">
            <input type="number" class="rd-admin-inp" style="width:72px;" min="1" max="20" value="${Number(sub.order || idx + 1)}" title="Thứ tự" oninput="window.updateDraftSub(${idx}, 'order', Number(this.value) || 1)">
          </div>
        `).join('')}
      </div>
    </div>

    <div class="rd-admin-section">
      <h4 class="rd-admin-sec-title">2. Điều Chỉnh Dạng Bài Theo Kỹ Năng (P1 / P2 / P3)</h4>
      <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
        ${['p1', 'p2', 'p3'].map(pk => `
          <button type="button" class="rd-psg-btn ${activeAdminPassage === pk ? 'is-active' : ''}" onclick="window.switchAdminPassage('${pk}')">
            ${pk === 'p1' ? 'Passage 1' : (pk === 'p2' ? 'Passage 2' : 'Passage 3')}
          </button>
        `).join('')}
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
        <input type="text" class="rd-admin-inp" value="${escapeHtml(currentGroup.title || '')}" placeholder="Tiêu đề Passage" oninput="window.updateDraftGroupMeta('title', this.value)">
        <input type="text" class="rd-admin-inp" value="${escapeHtml(currentGroup.subtitle || '')}" placeholder="Mô tả ngắn" oninput="window.updateDraftGroupMeta('subtitle', this.value)">
      </div>
      <div class="rd-admin-list">
        ${skills.map((sk, idx) => `
          <div class="rd-admin-row">
            <label style="display:flex; align-items:center; gap:6px; font-weight:800; min-width:125px;">
              <input type="checkbox" ${sk.enabled !== false ? 'checked' : ''} onchange="window.updateDraftSkill(${idx}, 'enabled', this.checked)">
              <code style="font-size:11.5px; color:#8B1518;">${escapeHtml(sk.tag)}</code>
            </label>
            <input type="text" class="rd-admin-inp" style="flex:1;" value="${escapeHtml(sk.label)}" placeholder="Tên dạng bài" oninput="window.updateDraftSkill(${idx}, 'label', this.value)">
            <input type="number" class="rd-admin-inp" style="width:72px;" min="1" max="50" value="${Number(sk.order || idx + 1)}" title="Thứ tự" oninput="window.updateDraftSkill(${idx}, 'order', Number(this.value) || 1)">
          </div>
        `).join('')}
      </div>
      <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
        <input type="text" id="newSkillTagInput" class="rd-admin-inp" style="width:150px;" placeholder="Mã Tag (vd: YNNG)">
        <input type="text" id="newSkillLabelInput" class="rd-admin-inp" style="flex:1;" placeholder="Tên dạng bài hiển thị mới...">
        <button type="button" class="rd-admin-btn rd-admin-btn-blue" onclick="window.addDraftSkill()">+ Thêm dạng</button>
      </div>
    </div>
  `;
}

function bindAdminGlobalHandlers() {
  window.openSubsystemAdminModal = () => {
    ensureAdminModalMounted();
    draftConfig = getActiveSubsystemsConfig();
    renderAdminModalBody();
    const modal = document.getElementById('subsystemAdminModal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeSubsystemAdminModal = () => {
    const modal = document.getElementById('subsystemAdminModal');
    if (modal) modal.style.display = 'none';
  };

  window.switchAdminPassage = (pk) => {
    activeAdminPassage = pk;
    renderAdminModalBody();
  };

  window.updateDraftSub = (idx, field, val) => {
    if (!draftConfig?.subsystems?.[idx]) return;
    draftConfig.subsystems[idx][field] = val;
  };

  window.updateDraftGroupMeta = (field, val) => {
    if (!draftConfig?.skillTree?.[activeAdminPassage]) return;
    draftConfig.skillTree[activeAdminPassage][field] = val;
  };

  window.updateDraftSkill = (idx, field, val) => {
    const list = draftConfig?.skillTree?.[activeAdminPassage]?.skills;
    if (!list || !list[idx]) return;
    list[idx][field] = val;
  };

  window.addDraftSkill = () => {
    const tagEl = document.getElementById('newSkillTagInput');
    const labelEl = document.getElementById('newSkillLabelInput');
    const tag = String(tagEl?.value || '').trim().toUpperCase().replace(/\s+/g, '_');
    const label = String(labelEl?.value || '').trim();
    if (!tag || !label) {
      alert('⚠️ Vui lòng nhập cả Mã Tag và Tên dạng bài!');
      return;
    }
    const list = draftConfig?.skillTree?.[activeAdminPassage]?.skills;
    if (!Array.isArray(list)) return;
    if (list.some(s => s.tag === tag)) {
      alert('⚠️ Mã Tag này đã tồn tại trong Passage đang chọn!');
      return;
    }
    list.push({ tag, label, enabled: true, order: list.length + 1 });
    renderAdminModalBody();
  };

  window.saveAdminSubsystems = async () => {
    if (!draftConfig) return;
    const ok = saveSubsystemsOverride(draftConfig);
    if (ok) {
      window.closeSubsystemAdminModal();
      await renderReadingCatalog();
      alert('✅ Đã lưu và áp dụng cấu hình phân hệ mới!');
    }
  };

  window.resetAdminSubsystems = async () => {
    if (!confirm('Khôi phục toàn bộ phân hệ Reading về mặc định ban đầu?')) return;
    resetSubsystemsOverride();
    draftConfig = getActiveSubsystemsConfig();
    renderAdminModalBody();
    await renderReadingCatalog();
  };

  window.exportAdminSubsystems = () => {
    exportSubsystemsConfigJson();
  };

  window.importAdminSubsystems = (event) => {
    try {
      const file = event?.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ''));
          if (!parsed || !Array.isArray(parsed.subsystems)) {
            alert('❌ File JSON cấu hình không hợp lệ!');
            return;
          }
          draftConfig = parsed;
          renderAdminModalBody();
          alert('✅ Đã nạp file cấu hình! Hãy bấm "Lưu & Áp dụng".');
        } catch (err) {
          alert('❌ Lỗi đọc nội dung JSON!');
        }
      };
      reader.readAsText(file);
    } catch (e) {}
  };
}

export function initSubsystemAdminEditor() {
  try {
    if (!isReadingAdmin()) return;
    bindAdminGlobalHandlers();
    const topNav = document.querySelector('.top-nav-bar');
    if (!topNav || document.getElementById('btnOpenSubsystemAdmin')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnOpenSubsystemAdmin';
    btn.className = 'btn-3d btn-3d-white';
    btn.style.cssText = 'padding: 8px 14px; font-size: 13px; border-color: #F59E0B; color: #92400E !important;';
    btn.innerText = '⚙️ Điều chỉnh Phân hệ';
    btn.onclick = () => window.openSubsystemAdminModal();
    topNav.appendChild(btn);
  } catch (e) {
    console.warn('Lỗi khởi tạo Admin Editor:', e);
  }
}
