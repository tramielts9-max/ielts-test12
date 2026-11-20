/**
 * reading/js-r/catalog-renderer.js
 * MODULE HIỂN THỊ DANH MỤC 5 PHÂN HỆ READING:
 * 1. Cambridge IELTS (17-21) | 2. Đề Vol (1-8)
 * 3. Bài Sưu Tầm (Full Đề) | 4. Luyện Theo Kỹ Năng (Chia P1 / P2 / P3)
 * 5. Đọc Phân Cấp CEFR (A2 • Band 4.0 | B1 • Band 5.0 | B2 • Band 6.0)
 */

import { getCamTests, getAvailableCamNumbers, getAvailableVolNumbers } from '../data-r/cam-vol-catalog.js';
import { getActiveSubsystemsConfig } from './reading-subsystems.config.js';
import { renderTagsHtml, renderSkillPillsHtml, getTagInfo } from '../../js/taxonomy-registry.js';

const GRADED_LEVEL_ORDER = ['a2', 'b1', 'b2'];

const GRADED_LEVEL_DEFAULTS = {
  a2: {
    cefr: 'A2',
    band: '4.0',
    tier: 'TIER_0',
    shortLabel: 'A2 • Band 4.0',
    label: 'Band 4.0 (CEFR A2 - Khởi Động)'
  },
  b1: {
    cefr: 'B1',
    band: '5.0',
    tier: 'TIER_1',
    shortLabel: 'B1 • Band 5.0',
    label: 'Band 5.0 (CEFR B1 - Nền Tảng)'
  },
  b2: {
    cefr: 'B2',
    band: '6.0',
    tier: 'TIER_2',
    shortLabel: 'B2 • Band 6.0',
    label: 'Band 6.0 (CEFR B2 - Tiêu Chuẩn)'
  }
};

const STATE = {
  series: 'cam',
  camVal: 21,
  volVal: 8,
  collectionSetFilter: 'ALL',
  collectionSearch: '',
  skillPassageKey: 'p1',
  selectedSkillTag: 'NOTE_COMP',
  manifest: null,
  manifestError: false,
  gradedLevel: 'a2',
  gradedPassageFilter: 'ALL',
  gradedSkillFilter: 'ALL',
  gradedSearch: '',
  gradedManifest: null,
  gradedManifestError: false
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
      const urlLower = url.toLowerCase();
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

      if (mode === 'graded') {
        // Bắt buộc khớp theo mã bài (vd: a2-101, b1-101, b2-101) để không bị nhầm giữa A2/B1/B2 cùng tên bài
        const keyLower = String(keyString || '').toLowerCase();
        const hasKey = Boolean(keyLower && urlLower.includes(keyLower));
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

export async function loadGradedManifest(forceReload = false) {
  if (STATE.gradedManifest && !forceReload) return STATE.gradedManifest;

  const candidateUrls = [
    `data-r/graded-manifest.json?t=${Date.now()}`,
    `data-r/graded/graded-manifest.json?t=${Date.now()}`
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      if (!json || typeof json !== 'object') continue;
      STATE.gradedManifest = {
        levels: json.levels && typeof json.levels === 'object' ? json.levels : {},
        items: Array.isArray(json.items) ? json.items : []
      };
      STATE.gradedManifestError = false;
      return STATE.gradedManifest;
    } catch (e) {}
  }

  console.warn('Không thể tải graded-manifest.json từ data-r/ hoặc data-r/graded/');
  STATE.gradedManifestError = true;
  STATE.gradedManifest = { levels: {}, items: [] };
  return STATE.gradedManifest;
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
  if (!GRADED_LEVEL_ORDER.includes(STATE.gradedLevel)) {
    STATE.gradedLevel = 'a2';
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
  const extraSubs = enabledSubsystems.filter(s => s.id === 'collection' || s.id === 'skills');
  let renderedExtraSubs = false;

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
    } else if ((sub.id === 'collection' || sub.id === 'skills') && !renderedExtraSubs) {
      renderedExtraSubs = true;
      html += `
        <div class="tabs-bar">
          <span class="tab-label" style="color: #0F766E;">Kho Bài Sưu Tầm:</span>
          ${extraSubs.map(exSub => {
            const isActive = STATE.series === exSub.id;
            const activeClass = exSub.id === 'collection' ? 'active-collection' : 'active-skills';
            return `
              <button type="button" class="tab-btn ${isActive ? activeClass : ''}" data-series="${exSub.id}" onclick="window.switchSeries('${exSub.id}', 1)">
                ${escapeHtml(exSub.label)} <span style="opacity:0.85; font-size:11.5px;">(${escapeHtml(exSub.badgeText || '')})</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    } else if (sub.id === 'graded') {
      html += `
        <div class="tabs-bar">
          <span class="tab-label" style="color: ${escapeHtml(sub.accentColor || '#7C3AED')};">${escapeHtml(sub.label)}:</span>
          ${GRADED_LEVEL_ORDER.map(lvl => {
            const meta = GRADED_LEVEL_DEFAULTS[lvl];
            const isActive = STATE.series === 'graded' && STATE.gradedLevel === lvl;
            return `
              <button type="button" class="tab-btn ${isActive ? `active-graded-${lvl}` : ''}" data-series="graded" data-val="${lvl}" onclick="window.switchSeries('graded', '${lvl}')">
                ${escapeHtml(meta.shortLabel)}
              </button>
            `;
          }).join('')}
        </div>
      `;
    }
  });

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

  const sets = [...STATE.manifest.sets].sort((a, b) => Number(a?.setId || 0) - Number(b?.setId || 0));
  const passagesMap = STATE.manifest.passages || {};
  const kw = STATE.collectionSearch.trim().toLowerCase();
  const totalPassagesCount = sets.reduce((sum, s) => sum + [s?.p1, s?.p2, s?.p3].filter(Boolean).length, 0);

  const filterBarHtml = `
    <div class="rd-subfilter-bar">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <b style="font-size:13.5px; color:#0F766E;">Chọn Bộ Sưu Tầm:</b>
        <select id="collectionSetSelect" class="rd-select-box" onchange="window.setCollectionFilter(this.value)">
          <option value="ALL" ${STATE.collectionSetFilter === 'ALL' ? 'selected' : ''}>Tất cả ${sets.length} bộ (${totalPassagesCount} bài)</option>
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
  const allPassages = Object.values(STATE.manifest.passages || {});
  const countByPNum = (n) => allPassages.filter(p => p && Number(p.passageNum) === n).length;
  const passageTabs = [
    { key: 'p1', num: 1, label: `Passage 1 (${countByPNum(1)} bài)` },
    { key: 'p2', num: 2, label: `Passage 2 (${countByPNum(2)} bài)` },
    { key: 'p3', num: 3, label: `Passage 3 (${countByPNum(3)} bài)` }
  ];

  const currentTree = tree[STATE.skillPassageKey] || { title: 'Kỹ năng', subtitle: '', skills: [] };
  const enabledSkills = (currentTree.skills || []).filter(s => s && s.enabled !== false).sort((a, b) => (a.order || 99) - (b.order || 99));

  if (enabledSkills.length > 0 && !enabledSkills.some(s => s.tag === STATE.selectedSkillTag)) {
    STATE.selectedSkillTag = enabledSkills[0].tag;
  }

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

function renderGradedCatalog() {
  if (!STATE.gradedManifest || !Array.isArray(STATE.gradedManifest.items) || STATE.gradedManifest.items.length === 0) {
    return `
      <div class="tabs-bar" style="justify-content:center; padding:28px; text-align:center;">
        <span>⚠️ Chưa tải được dữ liệu <code>graded-manifest.json</code>. Vui lòng đặt file vào <code>reading/data-r/graded-manifest.json</code> (hoặc <code>reading/data-r/graded/graded-manifest.json</code>).</span>
      </div>
    `;
  }

  const levelKey = GRADED_LEVEL_ORDER.includes(STATE.gradedLevel) ? STATE.gradedLevel : 'a2';
  const defaultMeta = GRADED_LEVEL_DEFAULTS[levelKey];
  const manifestMeta = STATE.gradedManifest.levels?.[levelKey] || {};
  const levelInfo = {
    cefr: manifestMeta.cefr || defaultMeta.cefr,
    band: manifestMeta.band || defaultMeta.band,
    label: manifestMeta.label || defaultMeta.label
  };

  const levelItems = STATE.gradedManifest.items
    .filter(item => item && String(item.level || '').toLowerCase() === levelKey)
    .sort((a, b) => {
      const pDiff = Number(a.passageNum || 0) - Number(b.passageNum || 0);
      if (pDiff !== 0) return pDiff;
      return Number(a.originCode || 0) - Number(b.originCode || 0);
    });

  if (levelItems.length === 0) {
    return `<div class="tabs-bar" style="justify-content:center;">Chưa có bài đọc nào thuộc trình độ <b>${escapeHtml(levelInfo.cefr)}</b>.</div>`;
  }

  // Đếm tiến độ hoàn thành & thống kê theo Passage
  let doneCount = 0;
  const pCounts = { 1: 0, 2: 0, 3: 0 };
  const skillCountMap = {};

  levelItems.forEach(item => {
    const pNum = Number(item.passageNum) || 1;
    if (pCounts[pNum] !== undefined) pCounts[pNum]++;
    if (getCompletedRecord(item.code, item.title, { mode: 'graded' })) doneCount++;
    if (Array.isArray(item.skills)) {
      item.skills.forEach(sk => {
        if (!sk) return;
        const tag = String(sk).trim().toUpperCase();
        skillCountMap[tag] = (skillCountMap[tag] || 0) + 1;
      });
    }
  });

  const availableSkills = Object.keys(skillCountMap).sort((a, b) => skillCountMap[b] - skillCountMap[a]);
  if (STATE.gradedSkillFilter !== 'ALL' && !availableSkills.includes(STATE.gradedSkillFilter)) {
    STATE.gradedSkillFilter = 'ALL';
  }

  const pctDone = Math.round((doneCount / levelItems.length) * 100);
  const avgWords = Math.round(levelItems.reduce((sum, it) => sum + (Number(it.wordCount) || 0), 0) / levelItems.length);
  const avgQuestions = Math.round(levelItems.reduce((sum, it) => sum + (Number(it.questionCount) || 0), 0) / levelItems.length);

  const heroHtml = `
    <div class="rd-graded-banner graded-banner-${levelKey}">
      <div class="rd-graded-banner-main">
        <div class="rd-graded-pill-row">
          <span class="rd-graded-cefr-pill pill-${levelKey}">${escapeHtml(levelInfo.cefr)} • Band ${escapeHtml(levelInfo.band)}</span>
          <span class="rd-graded-stat-pill">📚 ${levelItems.length} bài đọc</span>
          <span class="rd-graded-stat-pill">📝 ~${avgWords} từ/bài</span>
          <span class="rd-graded-stat-pill">❓ ~${avgQuestions} câu/bài</span>
        </div>
        <h3 class="rd-graded-banner-title">${escapeHtml(levelInfo.label)}</h3>
      </div>
      <div class="rd-graded-progress-box">
        <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:900; margin-bottom:5px;">
          <span>Tiến độ ${escapeHtml(levelInfo.cefr)}</span>
          <span>${doneCount}/${levelItems.length} bài (${pctDone}%)</span>
        </div>
        <div class="rd-graded-progress-track">
          <div class="rd-graded-progress-fill fill-${levelKey}" style="width:${pctDone}%;"></div>
        </div>
      </div>
    </div>
  `;

  const filterBarHtml = `
    <div class="rd-subfilter-bar rd-graded-filter-bar">
      <div class="rd-graded-psg-group">
        ${[
          { val: 'ALL', label: `Tất cả (${levelItems.length})` },
          { val: '1', label: `Passage 1 (${pCounts[1]})` },
          { val: '2', label: `Passage 2 (${pCounts[2]})` },
          { val: '3', label: `Passage 3 (${pCounts[3]})` }
        ].map(btn => `
          <button type="button" class="rd-graded-psg-btn ${STATE.gradedPassageFilter === btn.val ? `is-active active-${levelKey}` : ''}" onclick="window.setGradedPassageFilter('${btn.val}')">
            ${escapeHtml(btn.label)}
          </button>
        `).join('')}
      </div>

      <div class="rd-graded-controls-right">
        <select id="gradedSkillSelect" class="rd-select-box" style="width:auto; min-width:190px;" onchange="window.setGradedSkillFilter(this.value)">
          <option value="ALL" ${STATE.gradedSkillFilter === 'ALL' ? 'selected' : ''}>Tất cả dạng câu hỏi</option>
          ${availableSkills.map(tag => {
            const info = getTagInfo(tag);
            const label = info?.name ? `${info.name} (${skillCountMap[tag]})` : `${tag} (${skillCountMap[tag]})`;
            return `<option value="${escapeHtml(tag)}" ${STATE.gradedSkillFilter === tag ? 'selected' : ''}>${escapeHtml(label)}</option>`;
          }).join('')}
        </select>
        <input type="text" id="gradedSearchInput" class="rd-search-input" style="max-width:270px;" placeholder="Tìm mã (vd: 105, 209) hoặc tên bài..." value="${escapeHtml(STATE.gradedSearch)}" oninput="window.setGradedSearch(this.value)">
      </div>
    </div>
  `;

  const kw = STATE.gradedSearch.trim().toLowerCase();
  const filteredItems = levelItems.filter(item => {
    if (STATE.gradedPassageFilter !== 'ALL' && String(item.passageNum) !== STATE.gradedPassageFilter) {
      return false;
    }
    if (STATE.gradedSkillFilter !== 'ALL') {
      const skills = Array.isArray(item.skills) ? item.skills.map(s => String(s).toUpperCase()) : [];
      if (!skills.includes(STATE.gradedSkillFilter)) return false;
    }
    if (kw) {
      const hay = `${item.code || ''} ${item.originCode || ''} ${item.title || ''} ${item.displayName || ''}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });

  let bodyHtml = '';
  const passageNumsToShow = STATE.gradedPassageFilter === 'ALL' ? [1, 2, 3] : [Number(STATE.gradedPassageFilter)];

  passageNumsToShow.forEach(pNum => {
    const groupItems = filteredItems.filter(it => Number(it.passageNum) === pNum);
    if (groupItems.length === 0) return;

    bodyHtml += `
      <div class="test-heading graded-heading-${levelKey}">
        ${escapeHtml(levelInfo.cefr)} (Band ${escapeHtml(levelInfo.band)}) — Passage ${pNum}
        <span style="font-size:14px; font-weight:700; color:#64748B;">(${groupItems.length} bài đọc)</span>
      </div>
      <div class="test-grid">
    `;

    groupItems.forEach(item => {
      const safePath = item.filePath || `data-r/graded/${levelKey}/${item.code}.json`;
      const testUrl = `runner-reading.html?test=${encodeURIComponent(safePath)}&level=${encodeURIComponent(levelKey)}`;
      const rec = getCompletedRecord(item.code, item.title, { mode: 'graded' });
      const isDone = !!rec;
      const pillsHtml = renderSkillPillsHtml(item.skills, `MÃ ${item.originCode || item.code}`);

      bodyHtml += `
        <div class="test-card ${isDone ? 'is-completed' : ''}">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:6px; flex-wrap:wrap;">
              <span class="badge-reading badge-graded-${levelKey}">${escapeHtml(levelInfo.cefr)} • P${pNum} • Bài ${escapeHtml(item.originCode || item.code)}</span>
              ${isDone ? `<span class="badge-done">✓ Đã nộp (${escapeHtml(rec.score || 'N/A')})</span>` : ''}
            </div>
            <h4 class="card-title graded-title-${levelKey}">${escapeHtml(item.title || item.displayName)}</h4>
            <div class="rd-graded-card-meta">
              <span>📝 ${Number(item.wordCount) || 0} từ</span>
              <span>•</span>
              <span>❓ ${Number(item.questionCount) || 0} câu hỏi</span>
              <span>•</span>
              <span>Band ${escapeHtml(item.band || levelInfo.band)}</span>
            </div>
            ${pillsHtml}
          </div>
          <a href="${testUrl}" class="btn-play ${isDone ? 'btn-done' : `btn-graded-${levelKey}`}">
            ${isDone ? '✓ Xem Lại / Làm Lại' : `Làm Bài ${escapeHtml(levelInfo.cefr)} →`}
          </a>
        </div>
      `;
    });

    bodyHtml += `</div>`;
  });

  if (!bodyHtml) {
    bodyHtml = `
      <div class="tabs-bar" style="justify-content:center; padding:24px;">
        Không tìm thấy bài đọc <b>${escapeHtml(levelInfo.cefr)}</b> nào khớp bộ lọc hiện tại.
      </div>
    `;
  }

  return heroHtml + filterBarHtml + bodyHtml;
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
  } else if (STATE.series === 'graded') {
    if (!STATE.gradedManifest) {
      container.innerHTML = `<div class="tabs-bar" style="justify-content:center;">⏳ Đang tải danh mục Đọc Phân Cấp A2 / B1 / B2...</div>`;
      await loadGradedManifest();
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
  } else if (STATE.series === 'graded') {
    container.innerHTML = renderGradedCatalog();
  }
}

function syncUrlStateSafe() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('series', STATE.series);
    if (STATE.series === 'graded') {
      url.searchParams.set('level', STATE.gradedLevel);
    } else {
      url.searchParams.delete('level');
    }
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}
}

export function initReadingCatalogEvents() {
  // Đọc trạng thái ban đầu từ URL (vd: reading.html?series=graded&level=b1)
  try {
    const params = new URLSearchParams(window.location.search);
    const urlSeries = String(params.get('series') || '').trim().toLowerCase();
    const urlLevel = String(params.get('level') || '').trim().toLowerCase();
    if (['cam', 'vol', 'collection', 'skills', 'graded'].includes(urlSeries)) {
      STATE.series = urlSeries;
    }
    if (GRADED_LEVEL_ORDER.includes(urlLevel)) {
      STATE.gradedLevel = urlLevel;
    }
  } catch (e) {}

  window.switchSeries = (series, val) => {
    STATE.series = series;
    if (series === 'cam' && val !== undefined) STATE.camVal = Number(val) || 21;
    if (series === 'vol' && val !== undefined) STATE.volVal = Number(val) || 8;
    if (series === 'graded') {
      const nextLvl = String(val || STATE.gradedLevel || 'a2').toLowerCase();
      if (GRADED_LEVEL_ORDER.includes(nextLvl)) {
        if (STATE.gradedLevel !== nextLvl) {
          STATE.gradedPassageFilter = 'ALL';
          STATE.gradedSkillFilter = 'ALL';
        }
        STATE.gradedLevel = nextLvl;
      }
    }
    syncUrlStateSafe();
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

  window.setGradedPassageFilter = (pVal) => {
    const allowed = ['ALL', '1', '2', '3'];
    STATE.gradedPassageFilter = allowed.includes(String(pVal)) ? String(pVal) : 'ALL';
    renderReadingCatalog();
  };

  window.setGradedSkillFilter = (skillTag) => {
    STATE.gradedSkillFilter = String(skillTag || 'ALL');
    renderReadingCatalog();
  };

  window.setGradedSearch = (val) => {
    STATE.gradedSearch = String(val || '');
    renderReadingCatalog();
    const inp = document.getElementById('gradedSearchInput');
    if (inp) {
      inp.focus();
      const len = inp.value.length;
      try { inp.setSelectionRange(len, len); } catch (e) {}
    }
  };
}
