/**
 * reading/js-r/skill-filter.js
 * BỘ LỌC DẠNG BÀI THEO KỸ NĂNG CHO RUNNER READING CHÍNH THỨC
 * (LỌC ĐÚNG NHÓM CÂU HỎI & ĐÁP ÁN THEO ?skill=... MÀ KHÔNG LÀM HỎNG CẤU TRÚC ĐỀ GỐC)
 */

import { getTagInfo } from '../../js/taxonomy-registry.js';

function inferGroupSkillTags(group) {
  const tags = [];
  try {
    if (!group || typeof group !== 'object') return tags;
    if (group.skillTag) tags.push(String(group.skillTag).trim().toUpperCase());
    if (Array.isArray(group.skillTags)) {
      group.skillTags.forEach(t => { if (t) tags.push(String(t).trim().toUpperCase()); });
    }

    const gType = String(group.type || '').toLowerCase();
    const gMeta = (String(group.title || '') + ' ' + String(group.instructions || '')).toLowerCase();

    if (gType.includes('tfng') || gMeta.includes('true/false/not given') || gMeta.includes('true –')) tags.push('TFNG');
    if (gType.includes('ynng') || gMeta.includes('yes/no/not given') || gMeta.includes('yes –')) tags.push('YNNG');
    if (gType === 'notes' || gType === 'note_comp' || gMeta.includes('complete the notes')) tags.push('NOTE_COMP');
    if (gType.includes('matching_info') || gType.includes('matching_paragraphs') || gMeta.includes('which paragraph') || gMeta.includes('which section')) tags.push('MATCH_INFO');
    if (gType.includes('matching_names') || gType.includes('matching_features') || gMeta.includes('list of people') || gMeta.includes('list of researchers')) tags.push('MATCH_FEATURES');
    if (gType.includes('matching_endings') || gMeta.includes('complete each sentence with the correct ending')) tags.push('MATCH_ENDINGS');
    if (gType.includes('matching_headings') || gMeta.includes('list of headings')) tags.push('MATCH_HEADINGS');
    if (gType.includes('table') || gMeta.includes('complete the table')) tags.push('TABLE_COMP');
    if (gType.includes('flow') || gMeta.includes('flow-chart')) tags.push('FLOW_CHART');

    const isChooseTwo = gType.includes('mcq_two') || gType.includes('choose_two') || gMeta.includes('choose two') || gMeta.includes('choose 2');
    if (isChooseTwo) {
      tags.push('MCQ_TWO');
    } else if (gType === 'mcq' || gMeta.includes('choose the correct letter')) {
      tags.push('MCQ');
    }

    const isSummaryBox = gType === 'summary_options' || gType === 'summary_box' || (gMeta.includes('complete the summary') && (gMeta.includes('list of words') || gMeta.includes('a–i') || gMeta.includes('a-i') || gMeta.includes('a–j') || gMeta.includes('a-j')));
    if (isSummaryBox) {
      tags.push('SUMMARY_BOX');
    } else if (gType === 'summary' || gMeta.includes('complete the summary')) {
      tags.push('SUMMARY_COMP');
    }
  } catch (e) {}
  return Array.from(new Set(tags));
}

export function applySkillFilter(rawData, rawSkillTag) {
  try {
    const skillTag = String(rawSkillTag || '').trim().toUpperCase();
    if (!skillTag || !rawData || typeof rawData !== 'object') {
      return {
        data: rawData,
        isSkillMode: false,
        skillTag: '',
        skillLabel: '',
        warning: ''
      };
    }

    const skillInfo = getTagInfo(skillTag);
    const skillLabel = skillInfo?.name || skillTag;
    const groups = Array.isArray(rawData.groups) ? rawData.groups : [];
    const questions = rawData.questions && typeof rawData.questions === 'object' ? rawData.questions : {};
    const baseAnswers = rawData.answers && typeof rawData.answers === 'object' ? rawData.answers : {};

    const matchedGroups = groups.filter(g => inferGroupSkillTags(g).includes(skillTag));

    if (matchedGroups.length === 0) {
      return {
        data: rawData,
        isSkillMode: true,
        skillTag,
        skillLabel,
        warning: `Không tìm thấy nhóm câu hỏi riêng cho kỹ năng "${skillLabel}", đang hiển thị toàn bộ bài đọc.`
      };
    }

    const allowedQIds = [];
    matchedGroups.forEach(g => {
      (g.questionIds || []).forEach(qId => {
        if (qId && !allowedQIds.includes(qId)) allowedQIds.push(qId);
      });
    });

    if (allowedQIds.length === 0) {
      return {
        data: rawData,
        isSkillMode: true,
        skillTag,
        skillLabel,
        warning: `Nhóm kỹ năng "${skillLabel}" chưa có câu hỏi hợp lệ, đang hiển thị toàn bộ bài đọc.`
      };
    }

    const filteredQuestions = {};
    const filteredAnswers = {};
    allowedQIds.forEach(qId => {
      if (questions[qId]) filteredQuestions[qId] = questions[qId];
      if (baseAnswers[qId] !== undefined) {
        filteredAnswers[qId] = baseAnswers[qId];
      } else if (questions[qId]?.finalAnswer !== undefined) {
        filteredAnswers[qId] = questions[qId].finalAnswer;
      }
    });

    const clonedData = {
      ...rawData,
      title: `${rawData.title || 'IELTS Reading'} • [Kỹ năng: ${skillLabel}]`,
      groups: matchedGroups,
      questions: filteredQuestions,
      answers: filteredAnswers
    };

    return {
      data: clonedData,
      isSkillMode: true,
      skillTag,
      skillLabel,
      warning: ''
    };
  } catch (e) {
    console.warn('Lỗi lọc kỹ năng Reading:', e);
    return {
      data: rawData,
      isSkillMode: false,
      skillTag: '',
      skillLabel: '',
      warning: ''
    };
  }
}
