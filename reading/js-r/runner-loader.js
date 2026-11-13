/**
 * reading/js-r/runner-loader.js
 * MODULE TẢI ĐỀ THI, ĐIỀU HƯỚNG PASSAGE (CAM / VOL / SƯU TẦM / KỸ NĂNG) & MODAL ĐÁP ÁN
 * (TÁCH NGUYÊN VẸN TỪ reading/runner-reading.html THEO MÔ HÌNH GATEWAY)
 */

import { buildReadingHtml } from './reading-builder.js';
import { initReadingApp } from './app-r.js';
import { applySkillFilter } from './skill-filter.js';

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

async function fetchManifestSafe() {
  try {
    const res = await fetch(`data-r/collection-manifest.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function buildCandidateUrls(testId) {
  const raw = String(testId || '').replace(/\.json$/i, '');
  const fileName = raw.includes('/') ? raw.split('/').pop() : raw;
  const folderName = fileName.replace(/-p\d+.*$/i, '');

  const urls = [
    `data-r/${folderName}/${fileName}.json`,
    `data-r/${fileName}.json`,
    `${raw}.json`,
    `data-r/${raw}.json`,
    `../data/${folderName}/${fileName}.json`
  ];

  const stMatch = fileName.match(/^st-([123])(\d{2})$/i);
  if (stMatch) {
    urls.unshift(`data-r/collection/p${stMatch[1]}/${fileName}.json`);
  }
  return { raw, fileName, urls: Array.from(new Set(urls)) };
}

function detectCurrentPassageNum(fileName) {
  const matchStandard = fileName.match(/-p(\d+)/i);
  if (matchStandard) return parseInt(matchStandard[1], 10) || 1;
  const matchSt = fileName.match(/^st-([123])\d{2}$/i);
  if (matchSt) return parseInt(matchSt[1], 10) || 1;
  return 1;
}

function buildSiblingUrl(currentHref, fileName, currentPassageNum, targetPassageNum) {
  try {
    if (/-p\d+/i.test(fileName)) {
      return currentHref.replace(new RegExp(`-p${currentPassageNum}`, 'i'), `-p${targetPassageNum}`);
    }
    const stMatch = fileName.match(/^st-([123])(\d{2})$/i);
    if (stMatch) {
      const suffix = stMatch[2];
      return currentHref
        .replace(new RegExp(`p${stMatch[1]}(?=/st-)`, 'i'), `p${targetPassageNum}`)
        .replace(new RegExp(`st-${stMatch[1]}${suffix}`, 'i'), `st-${targetPassageNum}${suffix}`);
    }
  } catch (e) {}
  return currentHref;
}

export async function initReadingRunner() {
  const params = new URLSearchParams(window.location.search);
  const testId = params.get('test');
  const skillParam = params.get('skill') || '';

  if (!testId) {
    alert('⚠️ Không tìm thấy mã đề thi!');
    window.location.href = 'reading.html';
    return;
  }

  const { fileName, urls } = buildCandidateUrls(testId);
  let rawData = null;

  for (const url of urls) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        rawData = await res.json();
        break;
      }
    } catch (e) {}
  }

  if (!rawData) {
    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) {
      mainContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; width: 100%; background:#FFFFFF; border-radius:20px; border:2px solid var(--border-color);">
          <h3 style="color: #DC2626; font-size:18px;">❌ Không tìm thấy file: <code>${escapeHtml(fileName)}.json</code></h3>
          <p style="color: var(--text-muted); font-size:14px;">Hãy kiểm tra lại xem file đã được nạp vào thư mục <code>reading/data-r/</code> (hoặc <code>reading/data-r/collection/</code>) chưa.</p>
          <a href="reading.html" style="color:#8B1518; font-weight:800;">← Quay về danh mục đề đọc</a>
        </div>
      `;
    }
    return;
  }

  const filterRes = applySkillFilter(rawData, skillParam);
  const data = filterRes.data;

  document.title = data.title || 'IELTS Reading Test';
  const titleEl = document.getElementById('testTitleHeader');
  if (titleEl) titleEl.innerText = data.title || 'IELTS Reading Test';

  const passageBox = document.getElementById('passageBox');
  if (passageBox) passageBox.innerHTML = data.passageHtml || '';

  const questionBox = document.getElementById('questionBox');
  if (questionBox && data.questions) {
    const warnBanner = filterRes.warning
      ? `<div style="background:#FEF3C7; color:#92400E; border:1.5px solid #F59E0B; border-radius:12px; padding:10px 14px; margin-bottom:14px; font-weight:800; font-size:13px;">⚠️ ${escapeHtml(filterRes.warning)}</div>`
      : '';
    questionBox.innerHTML = warnBanner + buildReadingHtml(data);
  }

  const derivedAnswers = data.answers || (
    data.questions
      ? Object.fromEntries(Object.entries(data.questions).map(([k, v]) => [k, v?.finalAnswer ?? '']))
      : {}
  );

  window.TEST_DATA = {
    title: data.title || 'IELTS Reading Test',
    answers: derivedAnswers
  };

  const qKeys = Object.keys(window.TEST_DATA.answers || {});
  const passagesContainer = document.getElementById('passagesNavContainer');
  let currentActiveIndex = 0;
  const currentPassageNum = detectCurrentPassageNum(fileName);

  if (passagesContainer) {
    const badgesHtml = qKeys.map((k, idx) => {
      const num = k.replace(/^[a-zA-Z]+/, '');
      return `<button type="button" class="q-badge-btn" id="badge_${k}" data-idx="${idx}">${num}</button>`;
    }).join('');

    let passagesHtml = '';

    if (filterRes.isSkillMode && filterRes.skillTag) {
      passagesHtml = `
        <div class="passage-group-tab active-tab">
          <b style="color:#8B1518; margin-right:4px;">🎯 ${escapeHtml(filterRes.skillLabel)}:</b> ${badgesHtml}
        </div>
        <div id="nextSkillPassageSlot" style="display:inline-flex; align-items:center;"></div>
      `;
      passagesContainer.innerHTML = passagesHtml;

      fetchManifestSafe().then(manifest => {
        try {
          const slot = document.getElementById('nextSkillPassageSlot');
          if (!slot || !manifest?.passages) return;
          const currentSt = fileName.match(/^st-(\d{3})$/i)?.[1] || '';
          const sameSkillList = Object.values(manifest.passages)
            .filter(p => p && Number(p.passageNum) === currentPassageNum && Array.isArray(p.skills) && p.skills.includes(filterRes.skillTag))
            .sort((a, b) => Number(a.code) - Number(b.code));
          const curIdx = sameSkillList.findIndex(p => String(p.code) === currentSt);
          const nextPsg = (curIdx >= 0 && curIdx + 1 < sameSkillList.length) ? sameSkillList[curIdx + 1] : null;
          if (nextPsg) {
            const nextUrl = `runner-reading.html?test=${encodeURIComponent(nextPsg.filePath)}&skill=${encodeURIComponent(filterRes.skillTag)}`;
            slot.innerHTML = `<div class="passage-group-tab inactive-tab" onclick="window.location.href='${nextUrl}'"><b>Bài tiếp cùng dạng (Mã ${escapeHtml(nextPsg.code)}) →</b></div>`;
          }
        } catch (e) {}
      });
    } else {
      for (let p = 1; p <= 3; p++) {
        if (p === currentPassageNum) {
          passagesHtml += `
            <div class="passage-group-tab active-tab">
              <b style="color:#8B1518; margin-right:4px;">Passage ${p}:</b> ${badgesHtml}
            </div>
          `;
        } else {
          const targetUrl = buildSiblingUrl(window.location.href, fileName, currentPassageNum, p);
          passagesHtml += `
            <div class="passage-group-tab inactive-tab" onclick="window.location.href='${targetUrl}'">
              <b>Passage ${p}</b> (13-14 câu)
            </div>
          `;
        }
      }
      passagesContainer.innerHTML = passagesHtml;
    }

    function scrollToQ(idx) {
      if (idx < 0 || idx >= qKeys.length) return;
      currentActiveIndex = idx;
      const targetId = qKeys[idx];
      const el = document.getElementById(targetId) || document.getElementById(`${targetId}_input`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const inputEl = document.getElementById(`${targetId}_input`);
        if (inputEl && inputEl.type !== 'hidden') setTimeout(() => inputEl.focus(), 250);
      }
    }

    qKeys.forEach((k, idx) => {
      document.getElementById(`badge_${k}`)?.addEventListener('click', () => scrollToQ(idx));
    });

    document.getElementById('btnPrevQ')?.addEventListener('click', () => scrollToQ(currentActiveIndex - 1));
    document.getElementById('btnNextQ')?.addEventListener('click', () => scrollToQ(currentActiveIndex + 1));
  }

  const modalBackdrop = document.getElementById('readingModalBackdrop');
  const modalBody = document.getElementById('modalDynamicBody');
  document.getElementById('btnOpenSheet')?.addEventListener('click', () => {
    if (!modalBody || !modalBackdrop) return;
    let rowsHtml = '';
    qKeys.forEach(k => {
      const num = k.replace(/^[a-zA-Z]+/, '');
      const textInp = document.getElementById(`${k}_input`);
      const radio = document.querySelector(`input[name="${k}"]:checked`);
      const val = radio ? radio.value.trim() : (textInp ? textInp.value.trim() : '');

      rowsHtml += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px 14px; font-weight:800; width:50px; text-align:center;">${num}</td>
          <td style="padding: 10px 14px; color: ${val ? '#261F1D' : '#756D68'}; font-weight:700;">
            ${val ? escapeHtml(val) : '<span style="color:#94A3B8; font-style:italic;">(Chưa trả lời)</span>'}
          </td>
        </tr>
      `;
    });

    modalBody.innerHTML = `
      <h3 style="margin-top:0; font-size:18px; font-weight:900; color:#8B1518;">📋 Bảng Đáp Án - Passage ${currentPassageNum}</h3>
      <div style="max-height: 55vh; overflow-y: auto; border: 2px solid var(--border-color); border-radius: 14px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14.5px;">
          <thead>
            <tr style="background:#FAF7F2; border-bottom:2px solid var(--border-color);">
              <th style="padding: 10px; width:50px;">#</th>
              <th style="padding: 10px; text-align:left;">Đáp án của em</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
    modalBackdrop.style.display = 'flex';
  });

  document.getElementById('btnCloseModal')?.addEventListener('click', () => {
    if (modalBackdrop) modalBackdrop.style.display = 'none';
  });
  modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) modalBackdrop.style.display = 'none';
  });

  await initReadingApp();

  const originalCheckAnswers = window.checkAnswers;
  window.checkAnswers = async function() {
    if (typeof originalCheckAnswers === 'function') await originalCheckAnswers();
    if (!modalBody || !modalBackdrop) return;

    let correctCount = 0;
    let tableRows = '';

    qKeys.forEach(k => {
      const num = k.replace(/^[a-zA-Z]+/, '');
      const expected = window.TEST_DATA.answers[k];
      const textInp = document.getElementById(`${k}_input`);
      const radio = document.querySelector(`input[name="${k}"]:checked`);
      const val = radio ? radio.value.trim() : (textInp ? textInp.value.trim() : '');

      let isCorrect = false;
      if (radio) {
        isCorrect = (val.toUpperCase() === String(expected).trim().toUpperCase());
      } else {
        const cleanVal = val.toLowerCase().replace(/\s+/g, ' ');
        if (Array.isArray(expected)) {
          isCorrect = expected.map(a => a.toLowerCase().trim()).includes(cleanVal);
        } else {
          isCorrect = (cleanVal === String(expected).toLowerCase().trim());
        }
      }

      if (isCorrect) correctCount++;

      const expStr = Array.isArray(expected) ? expected.join(' / ') : expected;
      tableRows += `
        <tr style="background: ${isCorrect ? '#F0FDF4' : '#FFF5F5'}; border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px; text-align: center; font-weight: 800;">${num}</td>
          <td style="padding: 10px; font-weight: 700; color: ${isCorrect ? '#166534' : '#991B1B'};">${val ? escapeHtml(val) : '—'}</td>
          <td style="padding: 10px; font-weight: 800; color: #166534;">${escapeHtml(expStr)}</td>
        </tr>
      `;
    });

    const total = qKeys.length;
    const timeSpent = document.getElementById('timerDisplay')?.innerText || '00:00';

    modalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 18px;">
        <h2 style="color: #8B1518; font-size: 24px; font-weight:900; margin: 0 0 6px 0;">🎉 KẾT QUẢ BÀI LÀM</h2>
        <div style="font-size: 22px; font-weight: 900; color: #261F1D;">${correctCount} / ${total} câu đúng</div>
        <div style="font-size: 14px; font-weight: 700; color: var(--text-muted); margin-top: 4px;">Thời gian hoàn thành: <b>${escapeHtml(timeSpent)}</b></div>
      </div>

      <div style="max-height: 52vh; overflow-y: auto; border: 2px solid var(--border-color); border-radius: 14px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #FAF7F2; border-bottom: 2px solid var(--border-color);">
              <th style="padding: 10px; text-align: center;">#</th>
              <th style="padding: 10px; text-align: left;">Đáp án của em</th>
              <th style="padding: 10px; text-align: left;">Đáp án chuẩn</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
    modalBackdrop.style.display = 'flex';
  };
}
