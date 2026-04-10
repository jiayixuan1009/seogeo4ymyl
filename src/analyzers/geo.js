// ===== SEOGEO4YMYL — GEO Optimization Analyzer =====
// v5: Source-Worthiness + AI Platform Citation + Agentic Commerce

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';

export const GeoAnalyzer = {
  id: 'geo',
  name: 'GEO 优化',
  icon: '🤖',
  weight: 0.18,
  requiredResources: ['html', 'llms'],
  sfCompatible: false,

  analyze(data) {
    const items = [];
    const checks = [];
    const text = (data.content?.textContent || '').toLowerCase();
    const schemas = data.schemas || [];

    // 1. Source-Worthiness Score
    let swScore = 0;
    const hasCitations = /according\s+to|source:|cited?\s+by|references?:|根据|来源|引用/.test(text);
    const hasStats = /\d+%|\d+\.\d+|billion|million|亿|万|统计/.test(text);
    const hasAuthority = schemas.some(s => s['@type'] === 'Organization' || s['@type'] === 'Person');
    const hasStructuredClaims = /fact|claim|evidence|数据|事实|证据/.test(text);

    if (hasCitations) swScore += 25;
    if (hasStats) swScore += 25;
    if (hasAuthority) swScore += 25;
    if (hasStructuredClaims) swScore += 25;

    items.push(createAuditItem({
      finding: `🔥 Source-Worthiness Score: ${swScore}/100`,
      evidence: `引用标记: ${hasCitations ? '✅' : '❌'}, 统计数据: ${hasStats ? '✅' : '❌'}, 权威Schema: ${hasAuthority ? '✅' : '❌'}, 事实声明: ${hasStructuredClaims ? '✅' : '❌'}`,
      impact: swScore >= 60 ? 'Pass' : swScore >= 30 ? 'Warning' : 'Critical',
      fix: swScore < 60 ? 'AI 引擎优先引用"值得信赖的来源"。增加引用标记、统计数据和权威Schema。' : null,
      prompt: swScore < 60 ? `提升 ${data.url} 的 Source-Worthiness Score。当前得分 ${swScore}/100。建议: 1) 添加权威来源引用 2) 使用具体统计数据 3) 添加 Organization/Person Schema 4) 增加事实性声明和证据` : null,
      confidence: 'Likely',
    }));
    checks.push({ check: swScore >= 50, points: 20 });

    // 2. AI Overview Citation Signals
    const atomicAnswers = data.content?.atomicAnswers || [];
    const hasDirectAnswer = atomicAnswers.length >= 1;
    const hasSummary = /summary|tl;dr|key\s*takeaways?|摘要|要点|总结/.test(text);
    const hasDefinitions = /is\s+defined?\s+as|refers?\s+to|means?\s+that|指的是|是指|定义为/.test(text);

    let citationScore = 0;
    if (hasDirectAnswer) citationScore += 30;
    if (hasSummary) citationScore += 25;
    if (hasDefinitions) citationScore += 20;
    if (schemas.length > 0) citationScore += 25;

    items.push(createAuditItem({
      finding: `AI 引用可获取性: ${citationScore}/100`,
      evidence: `直接答案块: ${hasDirectAnswer ? '✅' : '❌'}, 摘要区: ${hasSummary ? '✅' : '❌'}, 定义语句: ${hasDefinitions ? '✅' : '❌'}, Schema: ${schemas.length > 0 ? '✅' : '❌'}`,
      impact: citationScore >= 60 ? 'Pass' : 'Warning',
      fix: citationScore < 60 ? '优化内容以增加 AI Overview 引用概率: 添加直接答案段落和 TL;DR 摘要' : null,
      confidence: 'Likely',
    }));
    checks.push({ check: citationScore >= 50, points: 15 });

    // 3. Structured Data for GEO
    const geoSchemas = schemas.filter(s =>
      ['Organization', 'Person', 'FAQPage', 'HowTo', 'Article', 'FinancialProduct'].includes(s['@type'])
    );
    const schemaOk = geoSchemas.length >= 2;
    items.push(createAuditItem({
      finding: `GEO 相关 Schema: ${geoSchemas.length} 个`,
      evidence: geoSchemas.map(s => s['@type']).join(', ') || '无 GEO 增强 Schema',
      impact: schemaOk ? 'Pass' : 'Warning',
      fix: schemaOk ? null : '添加 Organization + Person + FAQPage Schema 以提升 AI 引用率',
      confidence: 'Confirmed',
    }));
    checks.push({ check: schemaOk, points: 12 });

    // 4. llms.txt
    const hasLlms = !!data.llmsTxt;
    items.push(createAuditItem({
      finding: hasLlms ? 'llms.txt 已配置' : 'llms.txt 未配置',
      evidence: hasLlms ? `内容长度: ${data.llmsTxt.length} 字符` : '缺少 AI 系统的站点描述文件',
      impact: 'Info',
      fix: hasLlms ? null : '创建 llms.txt 帮助 AI 系统理解站点结构 (潜力项)',
      confidence: 'Confirmed',
    }));
    checks.push({ check: hasLlms, points: 5 });

    // 5. Agentic Commerce Readiness (v5)
    const hasTransactional = /buy|purchase|order|subscribe|sign\s*up|register|开户|注册|购买|下单|交易/.test(text);
    const hasAPI = schemas.some(s => s['@type'] === 'WebAPI' || s['@type'] === 'Action');
    const hasPricing = /price|cost|fee|rate|pricing|价格|费用|汇率|手续费/.test(text);

    let agenticScore = 0;
    if (hasTransactional) agenticScore += 35;
    if (hasPricing) agenticScore += 35;
    if (hasAPI) agenticScore += 30;

    items.push(createAuditItem({
      finding: `🔥 Agentic Commerce 就绪度: ${agenticScore}/100`,
      evidence: `交易信号: ${hasTransactional ? '✅' : '❌'}, 价格信息: ${hasPricing ? '✅' : '❌'}, API Schema: ${hasAPI ? '✅' : '❌'}`,
      impact: agenticScore >= 50 ? 'Pass' : 'Info',
      fix: agenticScore < 50 ? 'Agentic Commerce 是 AI 直接促成交易的新趋势。确保价格、费率等交易信息以结构化方式呈现。' : null,
      confidence: 'Hypothesis',
    }));
    checks.push({ check: agenticScore >= 30, points: 8 });

    // 6. Content Depth
    const h2Count = data.headings?.h2?.length || 0;
    const depthOk = h2Count >= 4 && data.content?.wordCount >= 500;
    items.push(createAuditItem({
      finding: `话题深度: ${h2Count} 个子主题, ${data.content?.wordCount || 0} 词`,
      evidence: depthOk ? '内容具有足够深度' : '内容深度不足，AI 偏好全面深入的信息源',
      impact: depthOk ? 'Pass' : 'Warning',
      confidence: 'Likely',
    }));
    checks.push({ check: depthOk, points: 10 });

    const rawScore = scoreFromChecks(checks, 70);
    return createModuleResult('geo', rawScore, items, ['2026-critical', 'ai-first', 'geo']);
  },
};
