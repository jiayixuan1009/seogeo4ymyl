// ===== SEOGEO4YMYL — Unified Analysis Engine =====
// Single entry point: URL (required) + Keyword (optional) + Competitors (optional)
// Output: { summary, insights, actions } — the 3-layer pyramid

import { runAllAnalyzers } from './registry.js';
import { analyzeQueryMatch } from './query-driven.js';
import { analyzeCompetitiveGeo } from './competitive-geo.js';
import { generateStrategies, generateTop5Summary, EXEC_PRIORITY_META } from '../utils/strategy-templates.js';
import { READINESS_LABELS } from '../utils/constants.js';
import { VERDICTS, runDecisionEngine } from '../core/engine/rule-engine.js';

export { VERDICTS };

/**
 * 4 diagnostic dimensions with module mapping
 * Maps old 10 modules → 4 unified dimensions
 */
const DIMENSION_MAP = {
  structure: {
    label: '结构诊断',
    icon: '🏗️',
    weight: 0.30,
    moduleIds: ['onpage', 'structured-data', 'performance'],
    description: 'HTML 结构、Schema、原子答案、TL;DR、FAQ',
  },
  content: {
    label: '内容诊断',
    icon: '📝',
    weight: 0.35,
    moduleIds: ['content', 'ai-citation'],
    description: '内容深度、关键词覆盖、信息增益、AI 引用就绪结构',
  },
  trust: {
    label: '信任诊断',
    icon: '🛡️',
    weight: 0.25,
    moduleIds: ['geo', 'fintech-compliance', 'domain-authority', 'offpage'],
    description: 'E-E-A-T、来源引用、合规信号、域名权威',
  },
  fintech: {
    label: 'Fintech 增强',
    icon: '💰',
    weight: 0.10,
    moduleIds: ['fintech-compliance'],
    description: 'YMYL 合规、风险提示、监管信息',
    conditional: true, // Only active for Fintech keywords
  },
};

export { DIMENSION_MAP };

/**
 * Detect if this is a Fintech-related page
 */
function isFintechRelated(pageData, keyword) {
  const text = (pageData.content?.textContent || '').toLowerCase();
  const kw = (keyword || '').toLowerCase();
  const fintechPatterns = /invest|trading|forex|crypto|remit|汇款|交易|投资|外汇|加密|股票|基金|理财|贷款|保险|银行|fintech|defi|etf|ipo|fund/i;
  return fintechPatterns.test(text) || fintechPatterns.test(kw);
}

/**
 * Run the unified analysis pipeline
 * @param {Object} pageData - NormalizedPageData for the target URL
 * @param {Object} options
 * @param {string} [options.keyword] - Target keyword (optional)
 * @param {Object[]} [options.competitorPageDatas] - Competitor NormalizedPageData array (optional)
 * @param {string[]} [options.competitorUrls] - Competitor URLs (optional)
 * @returns {Object} - { summary, insights, actions, meta }
 */
export function runUnifiedAnalysis(pageData, options = {}) {
  const { keyword, competitorPageDatas = [], competitorUrls = [] } = options;
  const hasKeyword = !!keyword;
  const hasCompetitors = competitorPageDatas.length > 0;
  const isFintech = isFintechRelated(pageData, keyword);

  // === Phase 1: Run all 10 page-level analyzers ===
  const moduleResults = runAllAnalyzers(pageData);

  // === Phase 2: Run query-driven analysis (if keyword) ===
  let queryAnalysis = null;
  if (hasKeyword) {
    queryAnalysis = analyzeQueryMatch(keyword, pageData);
  }

  // === Phase 3: Run competitive analysis (if competitors) ===
  let competitiveAnalysis = null;
  if (hasCompetitors && hasKeyword) {
    competitiveAnalysis = analyzeCompetitiveGeo(pageData, competitorPageDatas, keyword);
  }

  // === Phase 4: Build 4-dimension insights ===
  const insights = buildInsights(moduleResults, queryAnalysis, competitiveAnalysis, isFintech);

  // === Phase 5: Build summary ===
  const summary = buildSummary(insights, queryAnalysis, competitiveAnalysis, hasKeyword, hasCompetitors);

  // === Phase 6: Decision Engine ===
  const decision = runDecisionEngine(summary, insights, queryAnalysis, competitiveAnalysis, hasKeyword, hasCompetitors);

  // === Phase 7: Build actions ===
  const actions = buildActions(moduleResults, competitiveAnalysis, queryAnalysis, decision);

  return {
    summary,
    decision,
    insights,
    actions,
    meta: {
      url: pageData.url,
      keyword: keyword || null,
      competitorUrls,
      hasKeyword,
      hasCompetitors,
      isFintech,
      timestamp: Date.now(),
    },
    // Keep raw data for drill-down
    raw: {
      moduleResults,
      queryAnalysis,
      competitiveAnalysis,
    },
  };
}

/**
 * Build insights from module results grouped by dimension
 */
function buildInsights(moduleResults, queryAnalysis, competitiveAnalysis, isFintech) {
  const dimensions = {};

  for (const [dimId, dim] of Object.entries(DIMENSION_MAP)) {
    // Skip Fintech dimension if not applicable
    if (dim.conditional && !isFintech) continue;

    // Collect all audit items from modules in this dimension
    const items = [];
    let totalScore = 0;
    let moduleCount = 0;

    for (const modId of dim.moduleIds) {
      const result = moduleResults.get(modId);
      if (!result) continue;

      moduleCount++;
      totalScore += result.rawScore;

      for (const item of (result.items || [])) {
        items.push({
          ...item,
          sourceModule: modId,
        });
      }
    }

    // Separate pass/fail items
    const issues = items.filter(i => i.impact === 'Critical' || i.impact === 'Warning');
    const passes = items.filter(i => i.impact === 'Pass');

    dimensions[dimId] = {
      ...dim,
      score: moduleCount > 0 ? Math.round(totalScore / moduleCount) : 0,
      issues,
      passes,
      issueCount: issues.length,
      passCount: passes.length,
    };
  }

  // Add competitive dimension if available
  if (competitiveAnalysis) {
    dimensions.competitive = {
      label: '竞品对标',
      icon: '⚔️',
      weight: 0,
      description: '对比矩阵 + 信息增益 + AI 引用概率',
      score: null, // No single score for competitive
      competitiveData: competitiveAnalysis,
      issueCount: competitiveAnalysis.panels.gaps?.length || 0,
      passCount: 0,
    };
  }

  // Add query match info if available
  if (queryAnalysis) {
    dimensions.content.queryAnalysis = queryAnalysis;
  }

  return dimensions;
}

/**
 * Build the summary layer
 */
function buildSummary(insights, queryAnalysis, competitiveAnalysis, hasKeyword, hasCompetitors) {
  // Overall score = weighted average of dimension scores
  let weightedSum = 0;
  let weightTotal = 0;

  for (const [dimId, dim] of Object.entries(insights)) {
    if (dimId === 'competitive' || dim.score === null || dim.score === undefined) continue;
    const weight = DIMENSION_MAP[dimId]?.weight || 0;
    weightedSum += dim.score * weight;
    weightTotal += weight;
  }

  const overallScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  // Overall rating
  let rating, ratingColor, ratingEmoji;
  if (overallScore >= 70) {
    rating = '页面质量良好';
    ratingColor = 'var(--accent-green)';
    ratingEmoji = '🟢';
  } else if (overallScore >= 40) {
    rating = '需调整内容结构';
    ratingColor = 'var(--accent-gold)';
    ratingEmoji = '🟡';
  } else {
    rating = '需要重大改进';
    ratingColor = 'var(--accent-red)';
    ratingEmoji = '🔴';
  }

  // Key metrics
  const metrics = [];

  // AI Citation probability (from competitive analysis or standalone)
  if (competitiveAnalysis?.panels?.citationSimulation) {
    const cs = competitiveAnalysis.panels.citationSimulation;
    metrics.push({
      label: 'AI 引用概率',
      value: `${cs.myProbability}%`,
      color: cs.myProbability >= 50 ? 'var(--accent-green)' : cs.myProbability >= 25 ? 'var(--accent-gold)' : 'var(--accent-red)',
    });
  }

  // Information Gain (from competitive analysis)
  if (competitiveAnalysis?.panels?.informationGain) {
    const ig = competitiveAnalysis.panels.informationGain;
    metrics.push({
      label: '信息增益',
      value: ig.igLabel,
      color: ig.igColor,
    });
  }

  // Query match verdict (from query analysis)
  if (queryAnalysis?.panels?.verdict) {
    const v = queryAnalysis.panels.verdict;
    metrics.push({
      label: '关键词匹配度',
      value: `${v.matchScore}/100`,
      color: v.matchScore >= 70 ? 'var(--accent-green)' : v.matchScore >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)',
    });
  }

  // Intent type
  if (queryAnalysis?.panels?.intent) {
    metrics.push({
      label: 'Query Intent',
      value: queryAnalysis.panels.intent.label,
      color: 'var(--accent-blue)',
    });
  }

  // Readiness label
  const structureScore = insights.structure?.score || 0;
  const contentScore = insights.content?.score || 0;
  const trustScore = insights.trust?.score || 0;
  let readinessLabel;
  if (contentScore >= 70 && structureScore >= 65) {
    readinessLabel = READINESS_LABELS.AI_FIRST;
  } else if (structureScore >= 70 && contentScore >= 60) {
    readinessLabel = READINESS_LABELS.TRADITIONAL;
  } else {
    readinessLabel = READINESS_LABELS.NEEDS_WORK;
  }

  return {
    overallScore,
    rating,
    ratingColor,
    ratingEmoji,
    readinessLabel,
    metrics,
    hasKeyword,
    hasCompetitors,
    dimensionScores: {
      structure: insights.structure?.score || 0,
      content: insights.content?.score || 0,
      trust: insights.trust?.score || 0,
      fintech: insights.fintech?.score || null,
    },
  };
}

// Decision Engine logic moved to src/core/engine/rule-engine.js

/**
 * Build the actions layer - prioritized strategy list
 */
function buildActions(moduleResults, competitiveAnalysis, queryAnalysis, decision) {
  // Source 1: Strategies from competitive analysis gaps
  let strategies = [];
  if (competitiveAnalysis?.panels?.strategies) {
    strategies = [...competitiveAnalysis.panels.strategies];
  }

  // Source 2: Critical/Warning items from module results → convert to action items
  const moduleActions = [];
  for (const [modId, result] of moduleResults) {
    for (const item of (result.items || [])) {
      if ((item.impact === 'Critical' || item.impact === 'Warning') && item.fix) {
        moduleActions.push({
          title: item.finding,
          action: item.fix,
          codeTemplate: item.fixCode || null,
          execPriority: item.impact === 'Critical' ? 'P0' : 'P1',
          priority: item.impact === 'Critical'
            ? { level: 1, label: '🔴 Critical', cssClass: 'strategy-card--critical', execPriority: 'P0' }
            : { level: 2, label: '🟠 High', cssClass: 'strategy-card--high', execPriority: 'P1' },
          category: modId === 'onpage' || modId === 'structured-data' || modId === 'performance' ? 'structure'
                  : modId === 'content' || modId === 'ai-citation' ? 'content'
                  : 'trust',
          importance: `此问题在 ${item.impact === 'Critical' ? '页面评估中被标记为严重问题' : '页面评估中被标记为警告'}`,
          riskOfNotDoing: '不修复将持续影响搜索引擎评估和 AI 引用就绪度',
          benefitOfDoing: '修复后直接改善该维度的诊断得分',
          impact: item.evidence || '',
          source: 'module',
        });
      }
    }
  }

  // Source 3: Query analysis action items
  if (queryAnalysis?.panels?.verdict?.actionItems) {
    for (const action of queryAnalysis.panels.verdict.actionItems) {
      moduleActions.push({
        title: action,
        action: action,
        codeTemplate: null,
        execPriority: 'P1',
        priority: { level: 2, label: '🟠 High', cssClass: 'strategy-card--high', execPriority: 'P1' },
        category: 'content',
        importance: '基于 Query 匹配度分析的优化建议',
        riskOfNotDoing: '不执行将降低该关键词的排名竞争力',
        benefitOfDoing: '提升与目标关键词的匹配度',
        impact: '',
        source: 'query',
      });
    }
  }

  // Merge: competitive strategies take priority, then module actions (deduplicated)
  const allActions = [...strategies];
  // Add module actions that don't overlap with competitive strategies
  for (const ma of moduleActions) {
    const isDuplicate = allActions.some(s =>
      s.title === ma.title || (s.gapId && ma.title.includes(s.title))
    );
    if (!isDuplicate) {
      allActions.push(ma);
    }
  }

  // Sort: P0 first, then P1, then P2
  allActions.sort((a, b) => {
    const pa = a.priority?.level || 99;
    const pb = b.priority?.level || 99;
    return pa - pb;
  });

  // Generate Top 5
  const top5 = allActions.slice(0, 5).map((s, i) => ({
    rank: i + 1,
    title: s.title,
    execPriority: s.execPriority || s.priority?.execPriority || 'P2',
    importance: s.importance || '',
    riskOfNotDoing: s.riskOfNotDoing || '',
    benefitOfDoing: s.benefitOfDoing || '',
  }));

  return {
    strategies: allActions,
    top5,
    counts: {
      p0: allActions.filter(s => (s.execPriority || s.priority?.execPriority) === 'P0').length,
      p1: allActions.filter(s => (s.execPriority || s.priority?.execPriority) === 'P1').length,
      p2: allActions.filter(s => (s.execPriority || s.priority?.execPriority) === 'P2').length,
    },
    total: allActions.length,
  };
}
