// ===== SEOGEO4YMYL — Query-Driven Analyzer =====
// Mode ②: URL + Keyword → 5-panel intent/match diagnosis

import { classifyIntent, AI_CITATION_STRUCTURES, SERP_PROBABILITY_LABELS, FINTECH_INTENT_ENHANCEMENTS } from '../utils/query-intent-rules.js';

/**
 * Run full query-driven analysis
 * @param {string} keyword - Target keyword
 * @param {Object} pageData - NormalizedPageData from parser
 * @returns {Object} - 5-panel analysis result
 */
export function analyzeQueryMatch(keyword, pageData) {
  // Panel 1: Query Intent
  const intent = classifyIntent(keyword);

  // Panel 2: SERP Structure Inference
  const serpAnalysis = analyzeSerpStructure(intent);

  // Panel 3: AI Overview Citation Preference
  const citationPreference = analyzeCitationPreference(intent, keyword);

  // Panel 4: URL Match Assessment
  const matchAssessment = assessUrlMatch(keyword, pageData, intent);

  // Panel 5: Decision Verdict
  const verdict = generateVerdict(intent, matchAssessment, pageData);

  // Fintech YMYL enhancement
  const fintechEnhancement = checkFintechEnhancement(keyword, pageData);

  return {
    keyword,
    url: pageData.url,
    panels: {
      intent,
      serpAnalysis,
      citationPreference,
      matchAssessment,
      verdict,
    },
    fintechEnhancement,
  };
}

// === Panel 2: SERP Structure Inference ===
function analyzeSerpStructure(intent) {
  const features = {};
  for (const [feature, probability] of Object.entries(intent.serpFeatures)) {
    features[feature] = {
      probability,
      ...SERP_PROBABILITY_LABELS[probability],
    };
  }

  return {
    features,
    topPageTypes: intent.topPageTypes,
    summary: generateSerpSummary(intent),
  };
}

function generateSerpSummary(intent) {
  const aiProb = intent.serpFeatures.aiOverview;
  if (aiProb === 'high') {
    return `此类 ${intent.label} 查询有很高概率触发 AI Overview。Google 会综合多个来源生成回答，并引用结构化程度最高的内容。`;
  } else if (aiProb === 'medium') {
    return `此类查询有一定概率触发 AI Overview，但传统搜索结果仍占主导。Featured Snippet 可能出现。`;
  } else if (aiProb === 'low') {
    return `此类 ${intent.label} 查询通常不触发 AI Overview。用户意图明确指向具体行动，搜索结果以产品/交易页面为主。`;
  }
  return `此类查询极少触发 AI Overview。搜索结果以品牌官方页面为主。`;
}

// === Panel 3: AI Citation Preference Analysis ===
function analyzeCitationPreference(intent, keyword) {
  const preferredStructures = intent.aiCitationPreference.map(structId => {
    const struct = AI_CITATION_STRUCTURES[structId];
    if (!struct) return null;
    return {
      id: structId,
      label: struct.label,
      icon: struct.icon,
      description: struct.description,
      requires: struct.requires,
      htmlTemplate: struct.htmlTemplate,
    };
  }).filter(Boolean);

  return {
    preferredStructures,
    summary: `对于"${keyword}"这类 ${intent.label} 查询，AI Overview 更倾向引用: ${preferredStructures.map(s => s.label).join('、')}。`,
    structuralFeatures: [
      '30-150 词自包含段落（Atomic Answer）',
      'H2 子标题后紧跟直接回答',
      '有明确的数据来源标注',
      '结构化呈现（表格/列表/步骤）',
    ],
  };
}

// === Panel 4: URL Match Assessment ===
function assessUrlMatch(keyword, pageData, intent) {
  const checks = [];
  const kwLower = keyword.toLowerCase();
  const title = (pageData.meta?.title || '').toLowerCase();
  const h1Text = (pageData.headings?.h1?.[0] || '').toLowerCase();
  const h2s = pageData.headings?.h2 || [];
  const text = (pageData.content?.textContent || '').toLowerCase();
  const atomicAnswers = pageData.content?.atomicAnswers || [];
  const schemas = pageData.schemas || [];

  // Check 1: Keyword in Title
  const kwInTitle = title.includes(kwLower);
  checks.push({
    id: 'keyword_in_title',
    label: '目标关键词在 Title 中',
    pass: kwInTitle,
    detail: kwInTitle ? `Title 包含"${keyword}"` : `Title "${pageData.meta?.title}" 不包含目标关键词`,
  });

  // Check 2: Keyword in H1
  const kwInH1 = h1Text.includes(kwLower);
  checks.push({
    id: 'keyword_in_h1',
    label: '目标关键词在 H1 中',
    pass: kwInH1,
    detail: kwInH1 ? `H1 包含"${keyword}"` : `H1 "${pageData.headings?.h1?.[0] || '(无)'}" 不包含目标关键词`,
  });

  // Check 3: Keyword in H2s
  const kwInH2 = h2s.some(h => h.toLowerCase().includes(kwLower));
  checks.push({
    id: 'keyword_in_h2',
    label: '目标关键词在 H2 子标题中',
    pass: kwInH2,
    detail: kwInH2 ? '至少一个 H2 包含目标关键词' : '无 H2 包含目标关键词',
  });

  // Check 4: Keyword in body text (density)
  const kwCount = (text.match(new RegExp(escapeRegex(kwLower), 'g')) || []).length;
  const kwPresent = kwCount >= 2;
  checks.push({
    id: 'keyword_in_body',
    label: '正文中关键词出现',
    pass: kwPresent,
    detail: `关键词在正文中出现 ${kwCount} 次`,
  });

  // Check 5: Has atomic answers (for AI citation)
  const hasAtomicAnswers = atomicAnswers.length >= 2;
  checks.push({
    id: 'has_atomic_answers',
    label: '原子答案段 (≥2个)',
    pass: hasAtomicAnswers,
    detail: `检测到 ${atomicAnswers.length} 个 30-150 词自包含段落`,
  });

  // Check 6: AI-preferred structure for this intent
  const preferredStructs = intent.aiCitationPreference;
  const structureChecks = checkPreferredStructures(preferredStructs, pageData, text);
  checks.push({
    id: 'ai_preferred_structure',
    label: 'AI 引用偏好结构匹配',
    pass: structureChecks.matchCount >= Math.ceil(structureChecks.total / 2),
    detail: `匹配 ${structureChecks.matchCount}/${structureChecks.total} 种 AI 偏好结构: ${structureChecks.matched.join(', ') || '无'}`,
    subChecks: structureChecks.details,
  });

  // Check 7: Has TL;DR / Summary
  const hasSummary = /tl;dr|summary|key\s*(take\s*aways?|points?|highlights?)|摘要|要点|核心观点/.test(text);
  checks.push({
    id: 'has_summary',
    label: 'TL;DR / 摘要区',
    pass: hasSummary,
    detail: hasSummary ? '页面有可被 AI 快速提取的摘要' : '缺少摘要区域',
  });

  // Check 8: Schema present
  const hasSchema = schemas.length > 0;
  checks.push({
    id: 'has_schema',
    label: 'Schema 结构化数据',
    pass: hasSchema,
    detail: hasSchema ? `${schemas.length} 个 Schema (${schemas.map(s => s['@type']).filter(Boolean).join(', ')})` : '无 Schema',
  });

  // Calculate match score
  const passCount = checks.filter(c => c.pass).length;
  const matchScore = Math.round((passCount / checks.length) * 100);

  return {
    checks,
    matchScore,
    passCount,
    totalChecks: checks.length,
    intentMatch: kwInTitle || kwInH1,
    structureMatch: hasAtomicAnswers && hasSummary,
  };
}

function checkPreferredStructures(preferredIds, pageData, text) {
  const details = [];
  let matchCount = 0;

  for (const structId of preferredIds) {
    const struct = AI_CITATION_STRUCTURES[structId];
    if (!struct) continue;

    let matched = false;
    for (const pattern of struct.detectPatterns) {
      if (pattern.test(text) || pattern.test(pageData.content?.textContent || '')) {
        matched = true;
        break;
      }
    }

    details.push({ id: structId, label: struct.label, matched });
    if (matched) matchCount++;
  }

  return {
    matchCount,
    total: preferredIds.length,
    matched: details.filter(d => d.matched).map(d => d.label),
    details,
  };
}

// === Panel 5: Decision Verdict ===
function generateVerdict(intent, matchAssessment, pageData) {
  const { matchScore, intentMatch, structureMatch, checks } = matchAssessment;

  // Determine verdict type
  let type, title, description, actions;

  if (matchScore >= 70 && intentMatch) {
    // ✅ Good match
    type = 'fit';
    title = '✅ 适合 — 页面与 Query 高度匹配';
    description = '页面主题与目标关键词对齐，且具备基本的 AI 引用结构。以下为进一步优化建议：';
    actions = generateFitActions(checks, intent);
  } else if (intentMatch && matchScore >= 35) {
    // ⚠️ Needs restructuring
    type = 'adjust';
    title = '⚠️ 需调整内容结构 — 主题匹配但结构不足';
    description = '页面主题与目标关键词基本对齐，但内容结构不满足 AI Overview 的引用条件。需要针对性重构：';
    actions = generateAdjustActions(checks, intent);
  } else {
    // ❌ Wrong keyword
    type = 'switch';
    title = '❌ 建议换关键词 — 页面与 Query Intent 不匹配';
    description = '页面内容与目标关键词的搜索意图存在根本性偏差。建议调整关键词策略：';
    actions = generateSwitchActions(intent, pageData);
  }

  return {
    type, // 'fit' | 'adjust' | 'switch'
    title,
    description,
    matchScore,
    actions,
  };
}

function generateFitActions(checks, intent) {
  const actions = [];
  const failedChecks = checks.filter(c => !c.pass);

  for (const check of failedChecks) {
    switch (check.id) {
      case 'has_summary':
        actions.push('添加 Key Takeaways / TL;DR 摘要区，进一步提升 AI 引用概率');
        break;
      case 'has_atomic_answers':
        actions.push('在 H2 后补充 30-60 词原子答案段落');
        break;
      case 'has_schema':
        actions.push('添加 Article/FAQPage Schema 以增强结构化信号');
        break;
      case 'ai_preferred_structure':
        actions.push(`补充 ${intent.label} 查询偏好的内容结构: ${intent.aiCitationPreference.map(id => AI_CITATION_STRUCTURES[id]?.label).filter(Boolean).join('、')}`);
        break;
      default:
        actions.push(`修复: ${check.label} — ${check.detail}`);
    }
  }

  if (actions.length === 0) {
    actions.push('页面状态良好。持续监控排名变化，定期更新内容保持时效性。');
  }

  return actions;
}

function generateAdjustActions(checks, intent) {
  const actions = [];
  const failedChecks = checks.filter(c => !c.pass);

  // Priority order for restructuring
  const priorityMap = {
    'has_atomic_answers': 1,
    'has_summary': 2,
    'ai_preferred_structure': 3,
    'has_schema': 4,
    'keyword_in_h2': 5,
    'keyword_in_body': 6,
  };

  failedChecks
    .sort((a, b) => (priorityMap[a.id] || 99) - (priorityMap[b.id] || 99))
    .forEach(check => {
      switch (check.id) {
        case 'has_atomic_answers':
          actions.push('【关键】在每个 H2 标题后添加 30-60 词的直接回答段落，这是被 AI Overview 引用的核心结构');
          break;
        case 'has_summary':
          actions.push('【关键】在页面顶部添加 Key Takeaways 摘要区（3-5 条要点）');
          break;
        case 'ai_preferred_structure':
          actions.push(`补充此查询偏好的结构: ${intent.aiCitationPreference.map(id => AI_CITATION_STRUCTURES[id]?.label).filter(Boolean).join('、')}`);
          break;
        case 'has_schema':
          actions.push('添加 JSON-LD Schema（Article + Organization + FAQPage）');
          break;
        case 'keyword_in_h2':
          actions.push('在至少一个 H2 子标题中包含目标关键词');
          break;
        case 'keyword_in_body':
          actions.push('在正文中自然地多次提及目标关键词（建议 3-5 次）');
          break;
        default:
          actions.push(`${check.label}: ${check.detail}`);
      }
    });

  return actions;
}

function generateSwitchActions(intent, pageData) {
  const pageTitle = pageData.meta?.title || '(无标题)';
  const h1 = pageData.headings?.h1?.[0] || '(无 H1)';

  const actions = [
    `当前页面标题"${pageTitle}"和 H1"${h1}"与目标关键词的搜索意图不匹配`,
  ];

  // Suggest keyword direction based on page content
  const text = (pageData.content?.textContent || '').toLowerCase();

  if (/price|fee|cost|价格|费用|汇率/.test(text)) {
    actions.push('页面内容偏交易/价格信息 → 建议换用交易型关键词（如"[产品] 价格"、"[服务] 费用"）');
  } else if (/how|step|guide|如何|步骤|教程/.test(text)) {
    actions.push('页面内容偏操作指南 → 建议换用信息型/操作型关键词（如"如何使用 [产品]"、"[操作] 教程"）');
  } else if (/compare|vs|best|比较|推荐|哪个好/.test(text)) {
    actions.push('页面内容偏比较评测 → 建议换用比较型关键词（如"[A] vs [B]"、"最好的 [品类]"）');
  } else {
    actions.push(`建议将关键词从 ${intent.label} 方向调整为与页面实际内容更匹配的长尾关键词`);
  }

  actions.push('或者: 保留目标关键词，但需要全面重写页面内容以对齐搜索意图');

  return actions;
}

// === Fintech YMYL Enhancement ===
function checkFintechEnhancement(keyword, pageData) {
  const isFintech = FINTECH_INTENT_ENHANCEMENTS.triggerKeywords.some(p => p.test(keyword));

  if (!isFintech) return null;

  const text = (pageData.content?.textContent || '').toLowerCase();
  const checks = FINTECH_INTENT_ENHANCEMENTS.additionalChecks.map(check => ({
    ...check,
    pass: check.pattern.test(text),
  }));

  return {
    isFintech: true,
    label: '💰 Fintech YMYL 增强检查',
    checks,
    passed: checks.filter(c => c.pass).length,
    total: checks.length,
  };
}

// === Utility ===
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
