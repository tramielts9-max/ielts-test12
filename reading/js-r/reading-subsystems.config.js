/**
 * reading/js-r/reading-subsystems.config.js
 * CẤU HÌNH TRUNG TÂM CÁC PHÂN HỆ READING & CÂY KỸ NĂNG P1 / P2 / P3
 * CHO PHÉP ADMIN TÙY CHỈNH BẬT/TẮT, ĐỔI TÊN, SẮP XẾP THỨ TỰ KHÔNG CẦN SỬA CODE LÕI
 */

export const SUBSYSTEM_OVERRIDE_KEY = 'ielts_reading_subsystems_override';

export const DEFAULT_SUBSYSTEMS_CONFIG = {
  subsystems: [
    {
      id: 'cam',
      enabled: true,
      order: 1,
      label: 'Cambridge IELTS',
      badgeText: 'Cam 17 - 21',
      description: 'Bộ đề chuẩn Cambridge chính thức từ cuốn 17 đến 21',
      accentColor: '#8B1518'
    },
    {
      id: 'vol',
      enabled: true,
      order: 2,
      label: 'Đề Vol (1 - 8)',
      badgeText: 'Vol 1 - 8',
      description: 'IELTS Recent Actual Tests từ Vol 8 đến Vol 1',
      accentColor: '#4338CA'
    },
    {
      id: 'collection',
      enabled: true,
      order: 3,
      label: 'Bài Sưu Tầm (Full Đề)',
      badgeText: 'Bộ 01 - 20',
      description: '20 bộ đề sưu tầm (Mã 101–120, 201–220, 301–320) làm Full 3 Passage',
      accentColor: '#0F766E'
    },
    {
      id: 'skills',
      enabled: true,
      order: 4,
      label: 'Luyện Theo Kỹ Năng',
      badgeText: 'Chia P1 / P2 / P3',
      description: 'Luyện chuyên sâu từng dạng bài theo đúng cấu trúc Passage 1, 2, 3',
      accentColor: '#B45309'
    }
  ],

  skillTree: {
    p1: {
      title: 'Passage 1 (Mã 101 – 120)',
      subtitle: 'Luôn gồm 2 dạng nền tảng: Notes Completion & True/False/Not Given',
      skills: [
        { tag: 'NOTE_COMP', label: 'Notes Completion (1 word)', enabled: true, order: 1 },
        { tag: 'TFNG', label: 'True / False / Not Given', enabled: true, order: 2 }
      ]
    },
    p2: {
      title: 'Passage 2 (Mã 201 – 220)',
      subtitle: 'Phân loại đủ 9 dạng kỹ năng Passage 2 từ bộ đề sưu tầm',
      skills: [
        { tag: 'MATCH_INFO', label: 'Matching Information (Tìm đoạn chứa thông tin)', enabled: true, order: 1 },
        { tag: 'MATCH_FEATURES', label: 'Matching Features / People (Nối tên nhà nghiên cứu)', enabled: true, order: 2 },
        { tag: 'SUMMARY_COMP', label: 'Summary Completion (Điền 1 từ trong bài)', enabled: true, order: 3 },
        { tag: 'SUMMARY_BOX', label: 'Summary Completion (Chọn từ hộp A–J)', enabled: true, order: 4 },
        { tag: 'NOTE_COMP', label: 'Note Completion (Điền 1 từ vào ghi chú)', enabled: true, order: 5 },
        { tag: 'YNNG', label: 'Yes / No / Not Given', enabled: true, order: 6 },
        { tag: 'TFNG', label: 'True / False / Not Given', enabled: true, order: 7 },
        { tag: 'MCQ', label: 'Multiple Choice (Chọn 1 đáp án A–D)', enabled: true, order: 8 },
        { tag: 'MCQ_TWO', label: 'Multiple Choice (Chọn 2 đáp án A–E)', enabled: true, order: 9 }
      ]
    },
    p3: {
      title: 'Passage 3 (Mã 301 – 320)',
      subtitle: 'Phân loại đủ 4 dạng kỹ năng học thuật nâng cao Passage 3',
      skills: [
        { tag: 'MCQ', label: 'Multiple Choice (Chọn 1 đáp án A–D & Subtitle)', enabled: true, order: 1 },
        { tag: 'YNNG', label: 'Yes / No / Not Given', enabled: true, order: 2 },
        { tag: 'SUMMARY_BOX', label: 'Summary Completion (Chọn từ hộp A–I / A–J)', enabled: true, order: 3 },
        { tag: 'MATCH_ENDINGS', label: 'Matching Sentence Endings (Nối vế câu A–F / A–G)', enabled: true, order: 4 }
      ]
    }
  }
};

function safeClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return {};
  }
}

function mergeSkillList(defaultList = [], overrideList = []) {
  try {
    if (!Array.isArray(overrideList) || overrideList.length === 0) {
      return safeClone(defaultList).sort((a, b) => (a.order || 99) - (b.order || 99));
    }
    const merged = defaultList.map(defItem => {
      const ov = overrideList.find(x => x && x.tag === defItem.tag);
      return ov ? { ...defItem, ...ov } : { ...defItem };
    });
    overrideList.forEach(ov => {
      if (ov && ov.tag && !merged.some(m => m.tag === ov.tag)) {
        merged.push({ enabled: true, order: 99, ...ov });
      }
    });
    return merged.sort((a, b) => (a.order || 99) - (b.order || 99));
  } catch (e) {
    return safeClone(defaultList);
  }
}

export function getActiveSubsystemsConfig() {
  const base = safeClone(DEFAULT_SUBSYSTEMS_CONFIG);
  try {
    const raw = localStorage.getItem(SUBSYSTEM_OVERRIDE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return base;

    if (Array.isArray(parsed.subsystems)) {
      base.subsystems = base.subsystems.map(defSub => {
        const ov = parsed.subsystems.find(x => x && x.id === defSub.id);
        return ov ? { ...defSub, ...ov } : { ...defSub };
      }).sort((a, b) => (a.order || 99) - (b.order || 99));
    }

    if (parsed.skillTree && typeof parsed.skillTree === 'object') {
      ['p1', 'p2', 'p3'].forEach(pKey => {
        if (parsed.skillTree[pKey]) {
          const ovGroup = parsed.skillTree[pKey];
          base.skillTree[pKey] = {
            ...base.skillTree[pKey],
            title: ovGroup.title || base.skillTree[pKey].title,
            subtitle: ovGroup.subtitle || base.skillTree[pKey].subtitle,
            skills: mergeSkillList(base.skillTree[pKey].skills, ovGroup.skills)
          };
        }
      });
    }
    return base;
  } catch (e) {
    return base;
  }
}

export function saveSubsystemsOverride(newConfig) {
  try {
    if (!newConfig || typeof newConfig !== 'object') return false;
    localStorage.setItem(SUBSYSTEM_OVERRIDE_KEY, JSON.stringify(newConfig));
    return true;
  } catch (e) {
    console.warn('Không thể lưu cấu hình phân hệ:', e);
    return false;
  }
}

export function resetSubsystemsOverride() {
  try {
    localStorage.removeItem(SUBSYSTEM_OVERRIDE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

export function exportSubsystemsConfigJson() {
  try {
    const current = getActiveSubsystemsConfig();
    const jsonStr = JSON.stringify(current, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reading-subsystems-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.warn('Lỗi xuất file cấu hình:', e);
    return false;
  }
}

export function getSkillLabel(passageKey, skillTag) {
  try {
    const cfg = getActiveSubsystemsConfig();
    const pGroup = cfg.skillTree?.[passageKey];
    if (pGroup && Array.isArray(pGroup.skills)) {
      const found = pGroup.skills.find(s => s.tag === skillTag);
      if (found && found.label) return found.label;
    }
    return skillTag || 'Kỹ năng Reading';
  } catch (e) {
    return skillTag || 'Kỹ năng Reading';
  }
}
