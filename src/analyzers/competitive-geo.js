// ===== SEOGEO4YMYL — Competitive GEO Benchmarking Analyzer =====
// Mode ③: My URL + 3 Competitor URLs + Keyword → Gap Analysis + Executable Strategies

import { AI_CITATION_STRUCTURES } from '../utils/query-intent-rules.js';
import { GAP_IDS, generateStrategies } from '../utils/strategy-templates.js';

/**
 * Structural feature detectors
 * Each returns a boolean or value for a given pageData
 */
const STRUCTURE_DETECTORS = {
  hasTldr: {
    label: 'TL;DR / 摘要区',
    category: 'structure',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      return /tl;dr|summary|key\s*(take\s*aways?|points?|highlights?)|摘要|要点|核心观点|overview/.test(text);
    },
    gapId: GAP_IDS.MISSING_TLDR,
  },
  hasFaq: {
    label: 'FAQ 结构',
    category: 'structure',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      const schemas = data.schemas || [];
      return /faq|frequently\s+asked|常见问题|common\s+questions/.test(text)
        || schemas.some(s => s['@type'] === 'FAQPage');
    },
    gapId: GAP_IDS.MISSING_FAQ,
  },
  hasStats: {
    label: '统计数据',
    category: 'content',
    detect: (data) => {
      const text = (data.content?.textContent || '');
      // Look for patterns like "X%", "$X", "X billion", specific year data
      const statPatterns = /\d+%|\$\d|€\d|¥\d|\d+\s*(billion|million|thousand|亿|万)|according\s+to|source:|根据|数据显示/i;
      return statPatterns.test(text);
    },
    gapId: GAP_IDS.MISSING_STATS,
  },
  atomicAnswerCount: {
    label: '原子答案段 (30-150词)',
    category: 'structure',
    detect: (data) => (data.content?.atomicAnswers || []).length,
    isNumeric: true,
    threshold: 3,
    gapId: GAP_IDS.MISSING_ATOMIC,
  },
  hasTable: {
    label: '对比表格',
    category: 'structure',
    detect: (data) => {
      const text = (data.content?.textContent || '');
      return /<table/i.test(text) || /\|.*\|.*\|/.test(text);
    },
    gapId: GAP_IDS.MISSING_TABLE,
  },
  hasSteps: {
    label: '步骤列表 (ol)',
    category: 'structure',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      return /step\s*\d|第[一二三四五六七八九十\d]步|步骤|<ol/i.test(text);
    },
    gapId: GAP_IDS.MISSING_STEPS,
  },
  h2Count: {
    label: 'H2 子主题数',
    category: 'structure',
    detect: (data) => (data.headings?.h2 || []).length,
    isNumeric: true,
    threshold: 4,
    gapId: GAP_IDS.FEW_H2,
  },
  hasDefinition: {
    label: '定义句式',
    category: 'content',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      return /\bis\s+(defined?\s+as|a\s+\w|an\s+\w|the\s+\w)/i.test(text)
        || /\brefers?\s+to\b/i.test(text)
        || /是指|定义为|指的是|简单来说/.test(text);
    },
    gapId: GAP_IDS.MISSING_DEFINITION,
  },
  hasCaseStudy: {
    label: '案例/场景说明',
    category: 'content',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      return /case\s+study|example|scenario|for\s+instance|案例|场景|举例|实例|例如/.test(text);
    },
    gapId: null, // No direct strategy, part of content depth
  },
  hasSourceCitation: {
    label: '外部权威来源引用',
    category: 'trust',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      return /according\s+to|source:|cited?\s+by|references?:|根据.*报告|来源:/i.test(text);
    },
    gapId: GAP_IDS.MISSING_SOURCE_CITE,
  },
  hasAuthor: {
    label: '作者标识',
    category: 'trust',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      const schemas = data.schemas || [];
      return /author|written\s+by|reviewed\s+by|作者|撰写|审核/.test(text)
        || schemas.some(s => s['@type'] === 'Person');
    },
    gapId: GAP_IDS.MISSING_AUTHOR,
  },
  hasSchema: {
    label: 'Schema 结构化数据',
    category: 'trust',
    detect: (data) => (data.schemas || []).length > 0,
    gapId: GAP_IDS.MISSING_SCHEMA,
  },
  hasProsConsOrComparison: {
    label: '优缺点/对比分析',
    category: 'content',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      return /pros?\s*(and|&|\/)\s*cons?|advantage|disadvantage|优点|缺点|优势|劣势/.test(text);
    },
    gapId: GAP_IDS.MISSING_PROS_CONS,
  },
  hasEeatSignals: {
    label: 'E-E-A-T 信号',
    category: 'trust',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      return /reviewed\s+by|fact-checked|editorial\s+standards|verified\s+by|编辑审核|经审核|事实核查/.test(text);
    },
    gapId: GAP_IDS.MISSING_EEAT,
  },
  hasFreshness: {
    label: '内容时效性标记',
    category: 'trust',
    detect: (data) => {
      const text = (data.content?.textContent || '').toLowerCase();
      return /202[4-6]|last\s+updated|最后更新|更新于|updated\s+on/.test(text);
    },
    gapId: GAP_IDS.MISSING_FRESHNESS,
  },
  wordCount: {
    label: '内容字数',
    category: 'content',
    detect: (data) => data.content?.wordCount || 0,
    isNumeric: true,
    threshold: null, // Dynamic: compare against competitor average
    gapId: GAP_IDS.LOW_WORD_COUNT,
  },
};

// Keyword-in-title/H1 detector (needs keyword param)
function detectKeywordInTitle(data, keyword) {
  const kw = keyword.toLowerCase();
  const title = (data.meta?.title || '').toLowerCase();
  const h1 = (data.headings?.h1?.[0] || '').toLowerCase();
  return title.includes(kw) || h1.includes(kw);
}

/**
 * Run competitive GEO benchmarking analysis
 * @param {Object} myPageData - My page NormalizedPageData
 * @param {Object[]} competitorPageDatas - Array of competitor NormalizedPageData (1-3)
 * @param {string} keyword - Target keyword
 * @returns {Object} - 5-panel analysis + strategies
 */
export function analyzeCompetitiveGeo(myPageData, competitorPageDatas, keyword) {
  const allPages = [myPageData, ...competitorPageDatas];
  const totalCompetitors = competitorPageDatas.length;

  // === Panel 1: Comparison Matrix ===
  const comparisonMatrix = buildComparisonMatrix(myPageData, competitorPageDatas, keyword);

  // === Panel 2: Gap Identification ===
  const gaps = identifyGaps(comparisonMatrix, totalCompetitors);

  // === Panel 3: Information Gain Analysis ===
  const informationGain = analyzeInformationGain(myPageData, competitorPageDatas, keyword);

  // === Panel 4: AI Citation Probability Simulation ===
  const citationSimulation = simulateAiCitation(myPageData, competitorPageDatas, keyword);

  // === Panel 5: Executable Strategies ===
  const strategies = generateStrategies(gaps);

  return {
    keyword,
    myUrl: myPageData.url,
    competitorUrls: competitorPageDatas.map(d => d.url),
    panels: {
      comparisonMatrix,
      gaps,
      informationGain,
      citationSimulation,
      strategies,
    },
    totalCompetitors,
  };
}

/**
 * Build the full comparison matrix
 */
function buildComparisonMatrix(myPageData, competitorPageDatas, keyword) {
  const matrix = {};

  for (const [detectorId, detector] of Object.entries(STRUCTURE_DETECTORS)) {
    const myValue = detector.detect(myPageData);
    const compValues = competitorPageDatas.map(d => detector.detect(d));

    matrix[detectorId] = {
      label: detector.label,
      category: detector.category,
      isNumeric: !!detector.isNumeric,
      my: myValue,
      competitors: compValues,
      gapId: detector.gapId,
    };
  }

  // Special: keyword in title/H1
  matrix.keywordInTitle = {
    label: '关键词在 Title/H1 中',
    category: 'content',
    isNumeric: false,
    my: detectKeywordInTitle(myPageData, keyword),
    competitors: competitorPageDatas.map(d => detectKeywordInTitle(d, keyword)),
    gapId: GAP_IDS.KEYWORD_NOT_IN_TITLE,
  };

  return matrix;
}

/**
 * Identify gaps: things competitors have that my page doesn't
 */
function identifyGaps(matrix, totalCompetitors) {
  const gaps = [];

  for (const [detectorId, entry] of Object.entries(matrix)) {
    if (!entry.gapId) continue;

    let myHas, competitorCoverage;

    if (entry.isNumeric) {
      // For numeric values, compare my count against competitor average
      const compValues = entry.competitors;
      const compAvg = compValues.length > 0
        ? compValues.reduce((s, v) => s + v, 0) / compValues.length
        : 0;

      // Special case for word count
      if (detectorId === 'wordCount') {
        myHas = entry.my >= compAvg * 0.7; // Within 70% of competitor avg
        competitorCoverage = compValues.filter(v => v > entry.my * 1.3).length;
      } else {
        const threshold = STRUCTURE_DETECTORS[detectorId]?.threshold || 1;
        myHas = entry.my >= threshold;
        competitorCoverage = compValues.filter(v => v >= threshold).length;
      }
    } else {
      myHas = !!entry.my;
      competitorCoverage = entry.competitors.filter(v => !!v).length;
    }

    // Only flag as gap if my page doesn't have it AND at least 1 competitor does
    if (!myHas && competitorCoverage > 0) {
      // Determine severity
      let severity;
      if (competitorCoverage === totalCompetitors) {
        severity = 'critical'; // All competitors have it
      } else if (competitorCoverage >= Math.ceil(totalCompetitors / 2)) {
        severity = 'warning'; // Majority have it
      } else {
        severity = 'info'; // Minority have it
      }

      gaps.push({
        gapId: entry.gapId,
        label: entry.label,
        category: entry.category,
        severity,
        competitorCoverage,
        totalCompetitors,
        myValue: entry.my,
        competitorValues: entry.competitors,
        details: entry.isNumeric
          ? `我的页面: ${entry.my}, 竞品: ${entry.competitors.join(', ')}`
          : `我的页面: ${entry.my ? '✅' : '❌'}, 竞品: ${entry.competitors.map(v => v ? '✅' : '❌').join(', ')}`,
      });
    }
  }

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  gaps.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

  return gaps;
}

/**
 * Format comparison matrix for display
 * Returns structured data for the UI to render as a table
 */
export function formatMatrixForDisplay(matrix, myUrl, competitorUrls) {
  const rows = [];

  // Group by category
  const categories = { structure: [], content: [], trust: [] };

  for (const [id, entry] of Object.entries(matrix)) {
    const cat = entry.category || 'structure';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ id, ...entry });
  }

  return categories;
}

// ============================================================
// Information Gain Analysis
// ============================================================

/**
 * Extract key phrases/entities from page text for overlap comparison
 */
function extractKeyPhrases(text) {
  const cleaned = text.toLowerCase().replace(/[^\w\s\u4e00-\u9fff]/g, ' ');
  // Extract 2-3 word phrases
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  const phrases = new Set();
  for (let i = 0; i < words.length - 1; i++) {
    phrases.add(words[i] + ' ' + words[i + 1]);
    if (i < words.length - 2) {
      phrases.add(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
    }
  }
  return phrases;
}

/**
 * Extract topical H2 headings as content topics
 */
function extractTopics(data) {
  return (data.headings?.h2 || []).map(h => h.toLowerCase().trim()).filter(Boolean);
}

/**
 * Analyze information gain of my content vs competitors
 */
function analyzeInformationGain(myData, competitorDatas, keyword) {
  const myText = (myData.content?.textContent || '').toLowerCase();
  const myPhrases = extractKeyPhrases(myText);
  const myTopics = extractTopics(myData);
  const myEntities = (myData.content?.entities || []).map(e => e.name.toLowerCase());

  // Collect all competitor phrases, topics, entities
  const allCompPhrases = new Set();
  const allCompTopics = new Set();
  const allCompEntities = new Set();
  const perCompetitor = [];

  for (const comp of competitorDatas) {
    const cText = (comp.content?.textContent || '').toLowerCase();
    const cPhrases = extractKeyPhrases(cText);
    const cTopics = extractTopics(comp);
    const cEntities = (comp.content?.entities || []).map(e => e.name.toLowerCase());

    cPhrases.forEach(p => allCompPhrases.add(p));
    cTopics.forEach(t => allCompTopics.add(t));
    cEntities.forEach(e => allCompEntities.add(e));

    perCompetitor.push({ url: comp.url, phrases: cPhrases, topics: cTopics, entities: cEntities });
  }

  // 1. Content overlap — how many of my phrases appear in competitors
  let overlapCount = 0;
  for (const phrase of myPhrases) {
    if (allCompPhrases.has(phrase)) overlapCount++;
  }
  const overlapRatio = myPhrases.size > 0 ? overlapCount / myPhrases.size : 0;
  const commonInfoPercent = Math.round(overlapRatio * 100);

  // 2. Competitor-exclusive topics/entities
  const compExclusiveTopics = [...allCompTopics].filter(t => !myTopics.some(mt => mt.includes(t) || t.includes(mt)));
  const compExclusiveEntities = [...allCompEntities].filter(e => !myEntities.includes(e) && !myText.includes(e));

  // Categorize competitor-exclusive info
  const compExclusiveInfo = {
    data: [],   // statistics/numbers
    cases: [],  // case studies/examples
    comparisons: [], // comparison content
    uniqueViews: [], // unique perspectives
  };

  for (const comp of perCompetitor) {
    const cText = (competitorDatas.find(d => d.url === comp.url)?.content?.textContent || '').toLowerCase();
    // Check for stats not in my content
    if (/\d+%|\$\d|\d+\s*(billion|million|亿|万)/.test(cText) && !/\d+%|\$\d|\d+\s*(billion|million|亿|万)/.test(myText)) {
      compExclusiveInfo.data.push({ source: comp.url, type: '统计数据/数字' });
    }
    if (/case\s+study|real\s+example|测试|实测|真实/.test(cText) && !/case\s+study|real\s+example|测试|实测|真实/.test(myText)) {
      compExclusiveInfo.cases.push({ source: comp.url, type: '真实案例/测试' });
    }
    if (/<table|vs\.|比较|对比/.test(cText) && !/<table|vs\.|比较|对比/.test(myText)) {
      compExclusiveInfo.comparisons.push({ source: comp.url, type: '产品/方案对比' });
    }
  }

  // 3. My unique information
  const myExclusiveTopics = myTopics.filter(t => !allCompTopics.has(t) && ![...allCompTopics].some(ct => ct.includes(t) || t.includes(ct)));
  const myExclusiveEntities = myEntities.filter(e => !allCompEntities.has(e));
  const hasOriginalContent = /our\s+(analysis|research|data|findings)|we\s+(found|discovered|analyzed)|独家|原创|本站研究|first-hand/i.test(myText);
  const hasCitableValue = myExclusiveTopics.length > 0 || myExclusiveEntities.length >= 3 || hasOriginalContent;

  // 4. Information Gain Level
  let igLevel, igLabel, igColor;
  const uniqueScore = myExclusiveTopics.length * 15 + myExclusiveEntities.length * 3 + (hasOriginalContent ? 30 : 0) + (100 - commonInfoPercent) * 0.3;

  if (uniqueScore >= 60) {
    igLevel = 'high';
    igLabel = '🟢 高信息增益';
    igColor = 'var(--accent-green)';
  } else if (uniqueScore >= 30) {
    igLevel = 'medium';
    igLabel = '🟡 中等信息增益';
    igColor = 'var(--accent-gold)';
  } else {
    igLevel = 'low';
    igLabel = '🔴 低信息增益（内容农场风险）';
    igColor = 'var(--accent-red)';
  }

  // 5. Specific optimization suggestions
  const suggestions = [];
  if (compExclusiveInfo.data.length > 0) suggestions.push('增加权威统计数据（竞品有而你缺少）');
  if (compExclusiveInfo.cases.length > 0) suggestions.push('增加 1-2 个真实使用案例或测试结果');
  if (compExclusiveInfo.comparisons.length > 0) suggestions.push('增加产品/方案对比表格');
  if (compExclusiveTopics.length > 3) suggestions.push(`竞品独有 ${compExclusiveTopics.length} 个子主题未覆盖，扩展 H2 覆盖范围`);
  if (!hasOriginalContent) suggestions.push('添加原创数据、独家分析或第一手调研');
  if (commonInfoPercent > 70) suggestions.push('内容重复度高，重写或添加独特视角以区分竞品');

  return {
    commonInfoPercent,
    isParaphrase: commonInfoPercent > 70 && !hasOriginalContent,
    compExclusiveTopics: compExclusiveTopics.slice(0, 10),
    compExclusiveEntities: compExclusiveEntities.slice(0, 15),
    compExclusiveInfo,
    myExclusiveTopics,
    myExclusiveEntities: myExclusiveEntities.slice(0, 10),
    hasOriginalContent,
    hasCitableValue,
    igLevel,
    igLabel,
    igColor,
    uniqueScore: Math.round(uniqueScore),
    suggestions,
  };
}

// ============================================================
// AI Citation Probability Simulation
// ============================================================

/**
 * Calculate AI citation probability for a single page
 */
function calculateCitationProbability(data, keyword) {
  let score = 0;
  const reasons = [];
  const text = (data.content?.textContent || '').toLowerCase();
  const kw = keyword.toLowerCase();

  // Factor 1: Keyword relevance in Title/H1 (0-15)
  const title = (data.meta?.title || '').toLowerCase();
  const h1 = (data.headings?.h1?.[0] || '').toLowerCase();
  if (title.includes(kw)) { score += 10; reasons.push('✅ Title 包含目标关键词 (+10)'); }
  else reasons.push('❌ Title 不含目标关键词');
  if (h1.includes(kw)) { score += 5; reasons.push('✅ H1 包含目标关键词 (+5)'); }

  // Factor 2: Atomic answers / extractable content (0-20)
  const atomicCount = (data.content?.atomicAnswers || []).length;
  if (atomicCount >= 3) { score += 20; reasons.push(`✅ ${atomicCount} 个原子答案段，AI 可直接提取 (+20)`); }
  else if (atomicCount >= 1) { score += 10; reasons.push(`🔶 ${atomicCount} 个原子答案段，不够充足 (+10)`); }
  else reasons.push('❌ 无原子答案段，AI 难以提取引用');

  // Factor 3: Structured data signals (0-12)
  const schemas = data.schemas || [];
  if (schemas.length >= 2) { score += 12; reasons.push(`✅ ${schemas.length} 个 Schema 增强 AI 理解 (+12)`); }
  else if (schemas.length === 1) { score += 6; reasons.push('🔶 1 个 Schema (+6)'); }
  else reasons.push('❌ 无 Schema 结构化数据');

  // Factor 4: Authoritative signals (0-13)
  if (/reviewed\s+by|fact-checked|editorial|编辑审核|事实核查/.test(text)) {
    score += 8; reasons.push('✅ 有编辑审核/事实核查标记 (+8)');
  }
  if (/according\s+to|source:|根据|来源/.test(text)) {
    score += 5; reasons.push('✅ 引用了外部权威来源 (+5)');
  }

  // Factor 5: Content depth (0-10)
  const h2Count = (data.headings?.h2 || []).length;
  const wordCount = data.content?.wordCount || 0;
  if (h2Count >= 4 && wordCount >= 500) { score += 10; reasons.push(`✅ 有深度: ${h2Count} 个 H2, ${wordCount} 词 (+10)`); }
  else if (h2Count >= 2) { score += 5; reasons.push(`🔶 深度一般: ${h2Count} 个 H2, ${wordCount} 词 (+5)`); }
  else reasons.push('❌ 内容深度不足');

  // Factor 6: Summary/TL;DR (0-10)
  if (/tl;dr|summary|key\s*takeaways?|摘要|要点/.test(text)) {
    score += 10; reasons.push('✅ 有 TL;DR/摘要区 (+10)');
  } else {
    reasons.push('❌ 无摘要区，AI 需要自行提炼');
  }

  // Factor 7: Data-backed claims (0-10)
  if (/\d+%|\$\d|billion|million|亿|万/.test(text)) {
    score += 10; reasons.push('✅ 包含具体数据/统计 (+10)');
  } else {
    reasons.push('❌ 缺少具体数据支撑');
  }

  // Factor 8: Freshness (0-5)
  if (/202[5-6]|last\s+updated|最后更新/.test(text)) {
    score += 5; reasons.push('✅ 内容时效性达标 (+5)');
  }

  // Normalize to 0-100 (max possible = 95)
  const probability = Math.min(100, Math.round((score / 95) * 100));

  return { probability, score, reasons };
}

/**
 * Simulate AI citation selection across my page and competitors
 */
function simulateAiCitation(myData, competitorDatas, keyword) {
  const myResult = calculateCitationProbability(myData, keyword);
  const compResults = competitorDatas.map(d => ({
    url: d.url,
    ...calculateCitationProbability(d, keyword),
  }));

  // Rank all pages
  const allResults = [
    { url: myData.url, isMe: true, ...myResult },
    ...compResults.map(r => ({ ...r, isMe: false })),
  ].sort((a, b) => b.probability - a.probability);

  const myRank = allResults.findIndex(r => r.isMe) + 1;

  // Determine which content type AI prefers for this query
  const preferenceAnalysis = analyzeAiPreference(keyword);

  return {
    myProbability: myResult.probability,
    myReasons: myResult.reasons,
    myRank,
    totalPages: allResults.length,
    ranking: allResults,
    preferenceAnalysis,
    verdict: myRank === 1
      ? '你的页面在当前竞争环境中最有可能被 AI 引用'
      : `竞品 ${allResults[0].url} 更可能被 AI 引用，主要因为其引用就绪度得分更高 (${allResults[0].probability}% vs 你的 ${myResult.probability}%)`,
  };
}

/**
 * Analyze what content type/structure AI prefers for a keyword
 */
function analyzeAiPreference(keyword) {
  const kw = keyword.toLowerCase();
  const preferences = [];

  if (/是什么|what\s+is|定义|meaning|definition/i.test(kw)) {
    preferences.push({ type: '定义类内容', reason: '此查询寻求概念解释，AI 优先引用包含清晰定义句式的内容' });
  }
  if (/如何|怎么|how\s+to|步骤|guide|tutorial/i.test(kw)) {
    preferences.push({ type: '步骤/指南类内容', reason: '此查询寻求操作方法，AI 优先引用有序步骤列表' });
  }
  if (/比较|vs|best|推荐|哪个好|comparison/i.test(kw)) {
    preferences.push({ type: '对比表格/数据', reason: '此查询寻求选择建议，AI 优先引用结构化对比表格' });
  }
  if (/费用|价格|cost|price|fee|rate/i.test(kw)) {
    preferences.push({ type: '费用/价格数据', reason: '此查询寻求具体数字，AI 优先引用有明确费率和货币单位的内容' });
  }
  if (/安全|risk|风险|合规|regulate/i.test(kw)) {
    preferences.push({ type: '权威声明/数据', reason: '此 YMYL 查询要求高可信度，AI 优先引用有监管信息和风险声明的内容' });
  }

  if (preferences.length === 0) {
    preferences.push({ type: '综合信息类', reason: 'AI 偏好涵盖面广、结构清晰、有原子答案段和数据支撑的内容' });
  }

  return preferences;
}
