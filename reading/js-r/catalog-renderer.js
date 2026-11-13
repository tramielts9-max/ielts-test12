/**
 * reading/js-r/catalog-renderer.js
 * MODULE HIỂN THỊ DANH MỤC 4 PHÂN HỆ READING:
 * 1. Cambridge IELTS (17-21) | 2. Đề Vol (1-8)
 * 3. Bài Sưu Tầm (Full Đề 01-20) | 4. Luyện Theo Kỹ Năng (Chia P1 / P2 / P3)
 */

import { getCamTests, getAvailableCamNumbers, getAvailableVolNumbers } from '../data-r/cam-vol-catalog.js';
import { getActiveSubsystemsConfig } from './reading-subsystems.config.js';
import { renderTagsHtml, renderSkillPillsHtml } from '../../js/taxonomy-registry.js';

const STATE = {
  series: 'cam',
  camVal: 21,
  volVal: 8,
  collectionSetFilter: 'ALL',
  collectionSearch: '',
  skillPassageKey: 'p1',
  selectedSkillTag: 'NOTE_COMP',
  manifest: null,
  manifestError: false
};

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

export function getCompletedRecord(keyString, titleString, options = {}) {
  try {
    const raw = localStorage.getItem('ielts_local_history') || '[]';
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;

    const mode = options.mode || 'default';
    const skillTag = options.skillTag || '';

    return list.find(item => {
      if (!item) return false;
      const url = String(item.pageUrl || '');
      const title = String(item.testTitle || '').toLowerCase();

      if (mode === 'skill') {
        const hasKey = keyString && url.includes(keyString);
        const hasSkill = skillTag && url.includes(`skill=${skillTag}`);
        return Boolean(hasKey && hasSkill);
      }

      if (mode === 'collection') {
        const hasKey = keyString && url.includes(keyString);
        const isNotSkill = !url.includes('skill=');
        return Boolean(hasKey && isNotSkill);
      }

      const matchUrl = keyString && url.includes(keyString) && !url.includes('skill=');
      const matchTitle = titleString && title.includes(String(titleString).toLowerCase()) && !url.includes('skill=');
      return Boolean(matchUrl || matchTitle);
    }) || null;
  } catch (e) {
    return null;
  }
}

export async function loadCollectionManifest(forceReload = false) {
  if (STATE.manifest && !forceReload) return STATE.manifest;
  try {
    const res = await fetch(`data-r/collection-manifest.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json || typeof json !== 'object') throw new Error('Invalid manifest');
    STATE.manifest = {
      sets: Array.isArray(json.sets) ? json.sets : [],
      passages: json.passages && typeof json.passages === 'object' ? json.passages : {}
    };
    STATE.manifestError = false;
    return STATE.manifest;
  } catch (e) {
    console.warn('Không thể tải collection-manifest.json:', e);
    STATE.manifestError = true;
    STATE.manifest = { sets: [], passages: {} };
    return STATE.manifest;
  }
}

function getEnabledSubsystems() {
  try {
    const cfg = getActiveSubsystemsConfig();
    const subs = Array.isArray(cfg.subsystems) ? cfg.subsystems : [];
    return subs.filter(s => s && s.enabled !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  } catch (e) {
    return [];
  }
}

function ensureValidActiveSeries() {
  const enabled = getEnabledSubsystems();
  if (enabled.length === 0) return;
  if (!enabled.some(s => s.id === STATE.series)) {
    STATE.series = enabled[0].id;
  }
}

export function renderSeriesTabs() {
  const container = document.getElementById('seriesTabsContainer');
  if (!container) return;

  ensureValidActiveSeries();
  const enabledSubsystems = getEnabledSubsystems();

  if (enabledSubsystems.length === 0) {
    container.innerHTML = `<div class="tabs-bar"><i>Tất cả phân hệ đang bị tắt trong cấu hình Admin.</i></div>`;
    return;
  }

  let html = '';
  const camNums = getAvailableCamNumbers();
  const volNums = getAvailableVolNumbers();

  enabledSubsystems.forEach(sub => {
    if (sub.id === 'cam') {
      html += `
        <div class="tabs-bar">
          <span class="tab-label" style="color: ${escapeHtml(sub.accentColor || '#8B1518')};">${escapeHtml(sub.label)}:</span>
          ${camNums.map(num => `
            <button type="button" class="tab-btn ${STATE.series === 'cam' && STATE.camVal === num ? 'active-cam' : ''}" data-series="cam" data-val="${num}" onclick="window.switchSeries('cam', ${num})">Cam ${num}</button>
          `).join('')}
        </div>
      `;
    } else if (sub.id === 'vol') {
      html += `
        <div class="tabs-bar">
          <span class="tab-label" style="color: ${escapeHtml(sub.accentColor || '#4338CA')};">${escapeHtml(sub.label)}:</span>
          ${volNums.map(num => `
            <button type="button" class="tab-btn ${STATE.series === 'vol' && STATE.volVal === num ? 'active-vol' : ''}" data-series="vol" data-val="${num}" onclick="window.switchSeries('vol', ${num})">Vol ${num}</button>
          `).join('')}
        </div>
      `;
    }
  });

  const extraSubs = enabledSubsystems.filter(s => s.id === 'collection' || s.id === 'skills');
  if (extraSubs.length > 0) {
    html += `
      <div class="tabs-bar">
        <span class="tab-label" style="color: #0F766E;">Kho Bài Sưu Tầm:</span>
        ${extraSubs.map(sub => {
          const isActive = STATE.series === sub.id;
          const activeClass = sub.id === 'collection' ? 'active-collection' : 'active-skills';
          return `
            <button type="button" class="tab-btn ${isActive ? activeClass : ''}" data-series="${sub.id}" onclick="window.switchSeries('${sub.id}', 1)">
              ${escapeHtml(sub.label)} <span style="opacity:0.85; font-size:11.5px;">(${escapeHtml(sub.badgeText || '')})</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderCamCatalog() {
  const tests = getCamTests(STATE.camVal);
  if (!tests.length) {
    return `<div class="tabs-bar">Chưa có dữ liệu cho Cambridge ${STATE.camVal}.</div>`;
  }

  let html = '';
  tests.forEach(test => {
    html += `
      <div class="test-heading">
        Cambridge IELTS ${STATE.camVal} - Academic Reading Test ${test.testNum}
      </div>
      <div class="test-grid">
    `;
    (test.passages || []).forEach(psg => {
      const standardId = `READ_CAM${STATE.camVal}_T${test.testNum}_P${psg.p}`;
      const tagsHtml = renderTagsHtml(standardId);
      const fileKey = `cam${STATE.camVal}-test${test.testNum}-p${psg.p}`;
      const testUrl = `runner-reading.html?test=data-r/cam${STATE.camVal}-test${test.testNum}/${fileKey}.json`;

      const rec = getCompletedRecord(fileKey, psg.title, { mode: 'cam' });
      const isDone = !!rec;

      html += `
        <div class="test-card ${isDone ? 'is-completed' : ''}">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="badge-reading">Passage ${psg.p}</span>
              ${isDone ? `<span class="badge-done">✓ Đã nộp (${escapeHtml(rec.score || 'N/A')})</span>` : ''}
            </div>
            <h4 class="card-title">${escapeHtml(psg.title)}</h4>
            ${tagsHtml}
            <div class="card-desc">${escapeHtml(psg.desc)}</div>
          </div>
          <a href="${testUrl}" class="btn-play ${isDone ? 'btn-done' : ''}">
            ${isDone ? '✓ Xem Lại / Làm Lại' : 'Làm Bài Đọc →'}
          </a>
        </div>
      `;
    });
    html += `</div>`;
  });
  return html;
}

function renderVolCatalog() {
  const volNum = STATE.volVal;
  let html = '';
  for (let t = 1; t <= 10; t++) {
    html += `
      <div class="test-heading vol-heading">
        Vol ${volNum} Test ${t} - Reading
      </div>
      <div class="test-grid">
    `;
    for (let p = 1; p <= 3; p++) {
      const standardId = `READ_VOL${volNum}_T${t}_P${p}`;
      const tagsHtml = renderTagsHtml(standardId);
      const fileKey = `vol${volNum}-test${t}-p${p}`;
      const testUrl = `runner-reading.html?test=${fileKey}`;

      const rec = getCompletedRecord(fileKey, `Vol ${volNum} Test ${t} - Passage ${p}`, { mode: 'vol' });
      const isDone = !!rec;

      html += `
        <div class="test-card ${isDone ? 'is-completed' : ''}">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="badge-reading badge-vol">Passage ${p}</span>
              ${isDone ? `<span class="badge-done">✓ Đã nộp (${escapeHtml(rec.score || 'N/A')})</span>` : ''}
            </div>
            <h4 class="card-title vol-title">Vol ${volNum} Test ${t} - Passage ${p}</h4>
            ${tagsHtml}
            <div class="card-desc">IELTS Reading Practice Passage ${p}</div>
          </div>
          <a href="${testUrl}" class="btn-play ${isDone ? 'btn-done' : 'btn-vol'}">
            ${isDone ? '✓ Xem Lại / Làm Lại' : `Vào Làm Passage ${p} →`}
          </a>
        </div>
      `;
    }
    html += `</div>`;
  }
  return html;
}

function renderCollectionCatalog() {
  if (!STATE.manifest || !Array.isArray(STATE.manifest.sets) || STATE.manifest.sets.length === 0) {
    return `
      <div class="tabs-bar" style="justify-content:center; padding:28px;">
        <span>⚠️ Chưa tải được dữ liệu <code>collection-manifest.json</code>. Vui lòng kiểm tra file trong thư mục <code>reading/data-r/</code>.</span>
      </div>
    `;
  }

  const sets = STATE.manifest.sets;
  const passagesMap = STATE.manifest.passages || {};
  const kw = STATE.collectionSearch.trim().toLowerCase();

  const filterBarHtml = `
    <div class="rd-subfilter-bar">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <b style="font-size:13.5px; color:#0F766E;">Chọn Bộ Sưu Tầm:</b>
        <select id="collectionSetSelect" class="rd-select-box" onchange="window.setCollectionFilter(this.value)">
          <option value="ALL" ${STATE.collectionSetFilter === 'ALL' ? 'selected' : ''}>Tất cả 20 bộ (60 bài)</option>
          ${sets.map(s => `
            <option value="${escapeHtml(s.setId)}" ${STATE.collectionSetFilter === s.setId ? 'selected' : ''}>
              ${escapeHtml(s.title)} (Mã ${escapeHtml(s.p1)} - ${escapeHtml(s.p2)} - ${escapeHtml(s.p3)})
            </option>
          `).join('')}
        </select>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex:1; max-width:340px;">
        <input type="text" id="collectionSearchInput" class="rd-search-input" placeholder="Tìm theo mã (vd: 105, 209) hoặc tên bài..." value="${escapeHtml(STATE.collectionSearch)}" oninput="window.setCollectionSearch(this.value)">
      </div>
    </div>
  `;

  let bodyHtml = '';
  const filteredSets = sets.filter(s => STATE.collectionSetFilter === 'ALL' || s.setId === STATE.collectionSetFilter);

  filteredSets.forEach(set => {
    const pCodes = [set.p1, set.p2, set.p3].filter(Boolean);
    const matchedPassages = pCodes.map(c => passagesMap[c]).filter(p => {
      if (!p) return false;
      if (!kw) return true;
      return String(p.code).toLowerCase().includes(kw) ||
             String(p.title || '').toLowerCase().includes(kw) ||
             String(p.displayName || '').toLowerCase().includes(kw) ||
             String(set.title || '').toLowerCase().includes(kw);
    });

    if (matchedPassages.length === 0) return;

    bodyHtml += `
      <div class="test-heading collection-heading">
        ${escapeHtml(set.title)} <span style="font-size:14px; font-weight:700; color:#64748B;">(Full Test: Mã ${escapeHtml(set.p1)} • ${escapeHtml(set.p2)} • ${escapeHtml(set.p3)})</span>
      </div>
      <div class="test-grid">
    `;

    matchedPassages.forEach(psg => {
      const fileKey = `st-${psg.code}`;
      const testUrl = `runner-reading.html?test=${encodeURIComponent(psg.filePath)}&set=${encodeURIComponent(set.setId)}`;
      const rec = getCompletedRecord(fileKey, psg.displayName, { mode: 'collection' });
      const isDone = !!rec;
      const pillsHtml = renderSkillPillsHtml(psg.skills, `MÃ ${psg.code}`);

      bodyHtml += `
        <div class="test-card ${isDone ? 'is-completed' : ''}">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="badge-reading badge-collection">Passage ${psg.passageNum} • Mã ${escapeHtml(psg.code)}</span>
              ${isDone ? `<span class="badge-done">✓ Đã nộp (${escapeHtml(rec.score || 'N/A')})</span>` : ''}
            </div>
            <h4 class="card-title collection-title">${escapeHtml(psg.displayName)}</h4>
            <div style="font-size:13.5px; font-weight:800; color:#1E293B; margin-bottom:4px;">${escapeHtml(psg.title)}</div>
            ${pillsHtml}
          </div>
          <a href="${testUrl}" class="btn-play ${isDone ? 'btn-done' : 'btn-collection'}">
            ${isDone ? '✓ Xem Lại / Làm Lại' : `Làm Passage ${psg.passageNum} →`}
          </a>
        </div>
      `;
    });

    bodyHtml += `</div>`;
  });

  if (!bodyHtml) {
    bodyHtml = `<div class="tabs-bar" style="justify-content:center;">Không tìm thấy bài đọc nào khớp từ khóa "<b>${escapeHtml(STATE.collectionSearch)}</b>".</div>`;
  }

  return filterBarHtml + bodyHtml;
}

function renderSkillsCatalog() {
  if (!STATE.manifest || !STATE.manifest.passages) {
    return `<div class="tabs-bar">⚠️ Chưa có dữ liệu <code>collection-manifest.json</code> để lọc kỹ năng.</div>`;
  }

  const cfg = getActiveSubsystemsConfig();
  const tree = cfg.skillTree || {};
  const passageTabs = [
    { key: 'p1', num: 1, label: 'Passage 1 (101–120)' },
    { key: 'p2', num: 2, label: 'Passage 2 (201–220)' },
    { key: 'p3', num: 3, label: 'Passage 3 (301–320)' }
  ];

  const currentTree = tree[STATE.skillPassageKey] || { title: 'Kỹ năng', subtitle: '', skills: [] };
  const enabledSkills = (currentTree.skills || []).filter(s => s && s.enabled !== false).sort((a, b) => (a.order || 99) - (b.order || 99));

  if (enabledSkills.length > 0 && !enabledSkills.some(s => s.tag === STATE.selectedSkillTag)) {
    STATE.selectedSkillTag = enabledSkills[0].tag;
  }

  const allPassages = Object.values(STATE.manifest.passages || {});
  const currentPassageNum = passageTabs.find(t => t.key === STATE.skillPassageKey)?.num || 1;
  const passagesOfLevel = allPassages.filter(p => p && Number(p.passageNum) === currentPassageNum);

  let html = `
    <div class="rd-skill-panel">
      <div class="rd-passage-switcher">
        ${passageTabs.map(t => `
          <button type="button" class="rd-psg-btn ${STATE.skillPassageKey === t.key ? 'is-active' : ''}" onclick="window.selectSkillPassage('${t.key}')">
            ${escapeHtml(t.label)}
          </button>
        `).join('')}
      </div>
      <div style="margin:10px 0 12px 0;">
        <div style="font-size:15px; font-weight:900; color:#92400E;">${escapeHtml(currentTree.title || '')}</div>
        <div style="font-size:13px; font-weight:700; color:#756D68;">${escapeHtml(currentTree.subtitle || '')}</div>
      </div>
      <div class="rd-skill-chips">
        ${enabledSkills.length === 0 ? `<i>Chưa có kỹ năng nào được bật ở Passage này.</i>` : enabledSkills.map(sk => {
          const count = passagesOfLevel.filter(p => Array.isArray(p.skills) && p.skills.includes(sk.tag)).length;
          const isSel = STATE.selectedSkillTag === sk.tag;
          return `
            <button type="button" class="rd-skill-chip ${isSel ? 'is-selected' : ''}" onclick="window.selectSkillTag('${escapeHtml(sk.tag)}')">
              <span>${escapeHtml(sk.label)}</span>
              <span class="rd-skill-count">${count}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const selectedSkillObj = enabledSkills.find(s => s.tag === STATE.selectedSkillTag);
  const matchingPassages = passagesOfLevel
    .filter(p => Array.isArray(p.skills) && p.skills.includes(STATE.selectedSkillTag))
    .sort((a, b) => Number(a.code) - Number(b.code));

  html += `
    <div class="test-heading skills-heading">
      ${escapeHtml(selectedSkillObj ? selectedSkillObj.label : STATE.selectedSkillTag)} — ${matchingPassages.length} bài luyện tập
    </div>
  `;

  if (matchingPassages.length === 0) {
    html += `<div class="tabs-bar">Chưa có bài đọc nào thuộc dạng kỹ năng này.</div>`;
    return html;
  }

  html += `<div class="test-grid">`;
  matchingPassages.forEach(psg => {
    const fileKey = `st-${psg.code}`;
    const testUrl = `runner-reading.html?test=${encodeURIComponent(psg.filePath)}&skill=${encodeURIComponent(STATE.selectedSkillTag)}`;
    const rec = getCompletedRecord(fileKey, null, { mode: 'skill', skillTag: STATE.selectedSkillTag });
    const isDone = !!rec;
    const pillsHtml = renderSkillPillsHtml(psg.skills, `MÃ ${psg.code}`);

    html += `
      <div class="test-card ${isDone ? 'is-completed' : ''}">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:6px; flex-wrap:wrap;">
            <span class="badge-reading badge-skills">Passage ${psg.passageNum} • Kỹ năng</span>
            ${isDone ? `<span class="badge-done">✓ Đã nộp (${escapeHtml(rec.score || 'N/A')})</span>` : ''}
          </div>
          <h4 class="card-title skills-title">${escapeHtml(psg.displayName)}</h4>
          <div style="font-size:13.5px; font-weight:800; color:#1E293B; margin-bottom:4px;">${escapeHtml(psg.title)}</div>
          ${pillsHtml}
        </div>
        <a href="${testUrl}" class="btn-play ${isDone ? 'btn-done' : 'btn-skills'}">
          ${isDone ? '✓ Xem Lại / Luyện Lại' : 'Luyện Dạng Bài Này →'}
        </a>
      </div>
    `;
  });
  html += `</div>`;

  return html;
}

export async function renderReadingCatalog() {
  const container = document.getElementById('readingCatalogContainer');
  if (!container) return;

  renderSeriesTabs();

  if (STATE.series === 'collection' || STATE.series === 'skills') {
    if (!STATE.manifest) {
      container.innerHTML = `<div class="tabs-bar" style="justify-content:center;">⏳ Đang tải danh mục Bài Sưu Tầm...</div>`;
      await loadCollectionManifest();
    }
  }

  if (STATE.series === 'cam') {
    container.innerHTML = renderCamCatalog();
  } else if (STATE.series === 'vol') {
    container.innerHTML = renderVolCatalog();
  } else if (STATE.series === 'collection') {
    container.innerHTML = renderCollectionCatalog();
  } else if (STATE.series === 'skills') {
    container.innerHTML = renderSkillsCatalog();
  }
}

export function initReadingCatalogEvents() {
  window.switchSeries = (series, val) => {
    STATE.series = series;
    if (series === 'cam' && val !== undefined) STATE.camVal = Number(val) || 21;
    if (series === 'vol' && val !== undefined) STATE.volVal = Number(val) || 8;
    renderReadingCatalog();
  };

  window.setCollectionFilter = (setId) => {
    STATE.collectionSetFilter = setId || 'ALL';
    renderReadingCatalog();
  };

  window.setCollectionSearch = (val) => {
    STATE.collectionSearch = String(val || '');
    renderReadingCatalog();
    const inp = document.getElementById('collectionSearchInput');
    if (inp) {
      inp.focus();
      const len = inp.value.length;
      try { inp.setSelectionRange(len, len); } catch (e) {}
    }
  };

  window.selectSkillPassage = (pKey) => {
    if (['p1', 'p2', 'p3'].includes(pKey)) {
      STATE.skillPassageKey = pKey;
      renderReadingCatalog();
    }
  };

  window.selectSkillTag = (tag) => {
    STATE.selectedSkillTag = tag;
    renderReadingCatalog();
  };
}
