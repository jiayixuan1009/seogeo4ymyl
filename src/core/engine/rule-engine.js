// ===== Rule Engine / Decision Layer =====
// Evaluates analytical signals against predefined rules to generate verdicts and actions.

export const VERDICTS = {
  OPTIMIZE: {
    id: 'OPTIMIZE',
    label: '继续优化',
    emoji: '🔧',
    color: 'var(--accent-green)',
    template: '页面基础良好，通过针对性优化可显著提升表现。',
  },
  REBUILD: {
    id: 'REBUILD',
    label: '重写内容',
    emoji: '🔄',
    color: 'var(--accent-orange)',
    template: '页面存在结构性问题，局部修补收益低。建议基于现有 URL 重写内容。',
  },
  SWITCH_KEYWORD: {
    id: 'SWITCH_KEYWORD',
    label: '换关键词',
    emoji: '🎯',
    color: 'var(--accent-blue)',
    template: '页面内容与目标关键词意图不匹配。建议重新选择关键词或创建新页面。',
  },
  ABANDON: {
    id: 'ABANDON',
    label: '放弃此页',
    emoji: '⛔',
    color: 'var(--accent-red)',
    template: '页面综合质量过低且竞争差距过大。建议将资源投入到更有竞争力的页面。',
  },
};

/**
 * Run the Decision Engine
 * 12 rules → verdict + confidence + reasons + next_actions
 */
export function runDecisionEngine(summary, insights, queryAnalysis, competitiveAnalysis, hasKeyword, hasCompetitors) {
  // Collect signal levels
  const overall = summary.overallScore;
  const structure = summary.dimensionScores.structure;
  const content = summary.dimensionScores.content;
  const trust = summary.dimensionScores.trust;

  // Query match (if available)
  const matchScore = queryAnalysis?.panels?.verdict?.matchScore ?? null;
  const intentType = queryAnalysis?.panels?.verdict?.type ?? null; // 'fit' | 'adjust' | 'switch'

  // Competitive signals (if available)
  const citationProb = competitiveAnalysis?.panels?.citationSimulation?.myProbability ?? null;
  const igLevel = competitiveAnalysis?.panels?.informationGain?.igLevel ?? null; // 'high' | 'medium' | 'low'
  const gapCount = competitiveAnalysis?.panels?.gaps?.length ?? 0;

  // Convert scores to levels for rule evaluation
  const overallLevel = toLevel(overall);
  const structureLevel = toLevel(structure);
  const contentLevel = toLevel(content);
  const trustLevel = toLevel(trust);
  const matchLevel = matchScore !== null ? toLevel(matchScore) : null;
  const citationLevel = citationProb !== null ? toLevel(citationProb) : null;

  // Run rules — each returns { verdict, confidence, reason } or null
  const ruleResults = [
    // Rule 1: Intent mismatch + low IG → SWITCH_KEYWORD
    rule(intentType === 'switch' && igLevel !== 'high',
      VERDICTS.SWITCH_KEYWORD, 0.90,
      '页面与关键词搜索意图不匹配，且信息增益不足以弥补'),

    // Rule 2: Intent mismatch + no competitors → SWITCH_KEYWORD
    rule(intentType === 'switch' && !hasCompetitors,
      VERDICTS.SWITCH_KEYWORD, 0.75,
      '页面与关键词搜索意图不匹配'),

    // Rule 3: Very low overall + many gaps → ABANDON
    rule(overallLevel === 'low' && gapCount >= 8 && citationLevel === 'low',
      VERDICTS.ABANDON, 0.80,
      '综合质量低、竞品差距大、AI 引用概率极低，投入产出比不合理'),

    // Rule 4: Low overall + low content + low trust → REBUILD
    rule(overallLevel === 'low' && contentLevel === 'low' && trustLevel === 'low',
      VERDICTS.REBUILD, 0.85,
      '内容和信任维度均不及格，局部修补无法解决根本问题'),

    // Rule 5: Medium overall + low IG + many gaps → REBUILD
    rule(overallLevel === 'mid' && igLevel === 'low' && gapCount >= 5,
      VERDICTS.REBUILD, 0.70,
      '信息增益低（内容农场风险）且竞品差距大，需要全面重构内容'),

    // Rule 6: Low content + structure OK → REBUILD (content only)
    rule(contentLevel === 'low' && structureLevel !== 'low',
      VERDICTS.REBUILD, 0.65,
      '页面结构尚可但内容质量不足，建议在现有结构基础上重写内容'),

    // Rule 7: High overall + fit intent → OPTIMIZE
    rule(overallLevel === 'high' && (intentType === 'fit' || !hasKeyword),
      VERDICTS.OPTIMIZE, 0.90,
      '页面质量良好且与关键词匹配，可通过微调进一步提升'),

    // Rule 8: Mid overall + adjust intent + medium/high IG → OPTIMIZE
    rule(overallLevel === 'mid' && intentType === 'adjust' && igLevel !== 'low',
      VERDICTS.OPTIMIZE, 0.75,
      '页面主题匹配但结构需调整，信息增益可接受，优化成本低'),

    // Rule 9: Mid overall + no keyword → OPTIMIZE
    rule(overallLevel === 'mid' && !hasKeyword,
      VERDICTS.OPTIMIZE, 0.60,
      '页面基础中等，可通过结构优化提升（建议补充关键词分析以获得更精确判断）'),

    // Rule 10: High citation probability → OPTIMIZE
    rule(citationLevel === 'high' && overallLevel !== 'low',
      VERDICTS.OPTIMIZE, 0.80,
      'AI 引用概率已经较高，继续优化可巩固优势'),

    // Rule 11: Structure low + content OK → OPTIMIZE (structure focus)
    rule(structureLevel === 'low' && contentLevel !== 'low',
      VERDICTS.OPTIMIZE, 0.70,
      '内容质量尚可但结构不达标，结构优化成本低且收益高'),

    // Rule 12: Abandon fallback — everything is bad
    rule(overallLevel === 'low' && contentLevel === 'low' && structureLevel === 'low' && trustLevel === 'low',
      VERDICTS.ABANDON, 0.85,
      '所有维度均不及格，此页面不值得投入优化资源'),
  ].filter(Boolean);

  // Pick highest confidence verdict
  if (ruleResults.length === 0) {
    // Default: OPTIMIZE with low confidence
    return {
      verdict: VERDICTS.OPTIMIZE,
      confidence: 0.40,
      reasons: ['系统未命中明确规则，建议先补充关键词和竞品信息以获得更精确判断'],
      nextActions: ['添加目标关键词重新分析', '添加 2-3 个竞品 URL 以激活对标分析'],
      rulesFired: 0,
    };
  }

  // Sort by confidence descending
  ruleResults.sort((a, b) => b.confidence - a.confidence);
  const primary = ruleResults[0];

  // Collect all reasons for the winning verdict
  const matchingReasons = ruleResults
    .filter(r => r.verdict.id === primary.verdict.id)
    .map(r => r.reason);

  const nextActions = generateNextActions(primary.verdict, summary, queryAnalysis, competitiveAnalysis);

  return {
    verdict: primary.verdict,
    confidence: primary.confidence,
    reasons: matchingReasons,
    nextActions,
    rulesFired: ruleResults.length,
    allSignals: {
      overallLevel, structureLevel, contentLevel, trustLevel,
      matchLevel, citationLevel, igLevel,
      intentType, gapCount,
    },
  };
}

function rule(condition, verdict, confidence, reason) {
  if (!condition) return null;
  return { verdict, confidence, reason };
}

function toLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

function generateNextActions(verdict, summary, queryAnalysis, competitiveAnalysis) {
  switch (verdict.id) {
    case 'OPTIMIZE':
      return [
        '按 Top 5 必做事项清单依次执行',
        '优先处理 P0 级策略',
        '完成后重新扫描验证改进效果',
      ];
    case 'REBUILD':
      return [
        '保留当前 URL（不要删除页面）',
        '基于竞品中排名最高的内容结构，全面重写正文',
        '重写时确保包含: TL;DR + FAQ + 数据引用 + 原子答案段',
        '重写完成后重新扫描',
      ];
    case 'SWITCH_KEYWORD':
      return [
        '使用 Google Keyword Planner 或 Ahrefs 寻找与页面内容更匹配的关键词',
        queryAnalysis?.panels?.verdict?.actions?.[1] || '选择与页面实际内容对齐的长尾关键词',
        '用新关键词重新运行本工具分析',
      ];
    case 'ABANDON':
      return [
        '不要在此页面上投入更多优化资源',
        '将精力转移到其他更有竞争力的页面',
        '如果此关键词仍有商业价值，创建一个全新的专题页面',
      ];
    default:
      return ['请补充关键词和竞品信息以获得更精确的决策建议'];
  }
}
